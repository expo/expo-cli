import { Device } from '@expo/apple-utils';
import { getConfig, setCustomConfigPath } from '@expo/config';
import chalk from 'chalk';
import CliTable from 'cli-table3';
import fs from 'fs-extra';
import path from 'path';
import { User, UserManager } from 'xdl';

import CommandError from '../../CommandError';
import * as appleApi from '../../appleApi';
import { getRequestContext } from '../../appleApi';
import { getAppLookupParams } from '../../credentials/api/IosApi';
import { Context } from '../../credentials/context';
import { runCredentialsManager } from '../../credentials/route';
import { CreateIosDist } from '../../credentials/views/IosDistCert';
import { CreateOrReuseProvisioningProfileAdhoc } from '../../credentials/views/IosProvisioningProfileAdhoc';
import { SetupIosDist } from '../../credentials/views/SetupIosDist';
import { SetupIosPush } from '../../credentials/views/SetupIosPush';
import Log from '../../log';
import urlOpts from '../../urlOpts';
import { ora } from '../../utils/ora';
import { confirmAsync, promptEmailAsync } from '../../utils/prompts';
import { createClientBuildRequest, getExperienceName, isAllowedToBuild } from './clientBuildApi';
import generateBundleIdentifier from './generateBundleIdentifier';

export async function actionAsync(
  projectRoot: string,
  options: {
    appleId?: string;
    config?: string;
    parent?: {
      nonInteractive: boolean;
    };
  }
) {
  const disabledServices: { [key: string]: { name: string; reason: string } } = {
    pushNotifications: {
      name: 'Push Notifications',
      reason: 'not yet available until API tokens are supported for the Push Notification system',
    },
  };

  // get custom project manifest if it exists
  // Note: this is the current developer's project, NOT Expo Go's manifest
  const spinner = ora(`Finding custom configuration for Expo Go...`).start();
  if (options.config) {
    setCustomConfigPath(projectRoot, options.config);
  }
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  if (exp) {
    spinner.succeed(`Found custom configuration for Expo Go`);
  } else {
    spinner.warn(`Unable to find custom configuration for Expo Go`);
  }
  if (!exp.ios) exp.ios = {};

  if (!exp.facebookAppId || !exp.facebookScheme) {
    const disabledReason = exp
      ? `facebookAppId or facebookScheme are missing from app configuration. `
      : 'No custom configuration file could be found. You will need to provide a json file with valid facebookAppId and facebookScheme fields.';
    disabledServices.facebookLogin = { name: 'Facebook Login', reason: disabledReason };
  }
  if (!exp.ios.config?.googleMapsApiKey) {
    const disabledReason = exp
      ? `ios.config.googleMapsApiKey does not exist in the app configuration.`
      : 'No custom configuration file could be found. You will need to provide a json file with a valid ios.config.googleMapsApiKey field.';
    disabledServices.googleMaps = { name: 'Google Maps', reason: disabledReason };
  }
  if (exp.ios.googleServicesFile) {
    const contents = await fs.readFile(
      path.resolve(projectRoot, exp.ios.googleServicesFile!),
      'base64'
    );
    exp.ios.googleServicesFile = contents;
  }

  const user = await UserManager.getCurrentUserAsync();
  const context = new Context();
  await context.init(projectRoot, {
    ...options,
    allowAnonymous: true,
    nonInteractive: options.parent?.nonInteractive,
  });
  await context.ensureAppleCtx();
  const appleContext = context.appleCtx;
  if (user) {
    await context.ios.getAllCredentials(context.projectOwner); // initialize credentials
  }

  // check if any builds are in flight
  const { isAllowed, errorMessage } = await isAllowedToBuild({
    user,
    appleTeamId: appleContext.team.id,
  });

  if (!isAllowed) {
    throw new CommandError(
      'CLIENT_BUILD_REQUEST_NOT_ALLOWED',
      `New Expo Go build request disallowed. Reason: ${errorMessage}`
    );
  }

  const bundleIdentifier = generateBundleIdentifier(appleContext.team.id);
  const experienceName = await getExperienceName({ user, appleTeamId: appleContext.team.id });
  const appLookupParams = getAppLookupParams(experienceName, bundleIdentifier);

  await appleApi.ensureBundleIdExistsAsync(appleContext, appLookupParams, {
    enablePushNotifications: true,
  });

  const requestContext = getRequestContext(appleContext);
  const devices = await Device.getAllIOSProfileDevicesAsync(requestContext);
  const udids = devices.map(device => device.attributes.udid);

  let distributionCert;
  if (user) {
    await runCredentialsManager(context, new SetupIosDist(appLookupParams));
    distributionCert = await context.ios.getDistCert(appLookupParams);
  } else {
    distributionCert = await new CreateIosDist(appLookupParams.accountName).provideOrGenerate(
      context
    );
  }
  if (!distributionCert) {
    throw new CommandError(
      'INSUFFICIENT_CREDENTIALS',
      `This build request requires a valid distribution certificate.`
    );
  }

  let pushKey;
  if (user) {
    await runCredentialsManager(context, new SetupIosPush(appLookupParams));
    pushKey = await context.ios.getPushKey(appLookupParams);
  }

  let provisioningProfile;
  const createOrReuseProfile = new CreateOrReuseProvisioningProfileAdhoc(appLookupParams, {
    distCertSerialNumber: distributionCert.distCertSerialNumber!,
    udids,
  });
  if (user) {
    await runCredentialsManager(context, createOrReuseProfile);
    provisioningProfile = await context.ios.getProvisioningProfile(appLookupParams);
  } else {
    provisioningProfile = await createOrReuseProfile.createOrReuse(context);
  }
  if (!provisioningProfile) {
    throw new CommandError(
      'INSUFFICIENT_CREDENTIALS',
      `This build request requires a valid provisioning profile.`
    );
  }

  // push notifications won't work if we dont have any push creds
  // we also dont store anonymous creds, so user needs to be logged in
  if (pushKey === null || !user) {
    const disabledReason =
      pushKey === null
        ? 'you did not upload your push credentials'
        : 'we require you to be logged in to store push credentials';
    // TODO(quin): remove this when we fix push notifications
    // keep the default push notification reason if we haven't implemented API tokens
    disabledServices.pushNotifications.reason =
      disabledServices.pushNotifications.reason || disabledReason;
  }

  if (Object.keys(disabledServices).length > 0) {
    Log.newLine();
    Log.warn('These services will be disabled in your custom Expo Go app:');
    const table = new CliTable({ head: ['Service', 'Reason'], style: { head: ['cyan'] } });
    table.push(
      ...Object.keys(disabledServices).map(serviceKey => {
        const service = disabledServices[serviceKey];
        return [service.name, service.reason];
      })
    );
    Log.log(table.toString());
    Log.log(
      'See https://docs.expo.dev/guides/adhoc-builds/#optional-additional-configuration-steps for more details.'
    );
  }

  let email;
  if (user && user.kind === 'user') {
    email = user.email;
  } else {
    email = await promptEmailAsync({
      message: 'Please enter an email address to notify, when the build is completed:',
      initial: (context?.user as User)?.email,
    });
  }
  Log.newLine();

  let addUdid;
  if (udids.length === 0) {
    Log.log(
      'There are no devices registered to your Apple Developer account. Please follow the instructions below to register an iOS device.'
    );
    addUdid = true;
  } else {
    Log.log(
      'Custom builds of Expo Go can only be installed on devices which have been registered with Apple at build-time.'
    );
    Log.log('These devices are currently registered on your Apple Developer account:');
    const table = new CliTable({ head: ['Name', 'Identifier'], style: { head: ['cyan'] } });
    table.push(...devices.map(device => [device.attributes.name, device.attributes.udid]));
    Log.log(table.toString());

    const udidPrompt = await confirmAsync({
      message: 'Would you like to register a new device to use Expo Go with?',
    });
    addUdid = udidPrompt;
  }

  const result = await createClientBuildRequest({
    user,
    appleContext,
    distributionCert,
    provisioningProfile,
    pushKey,
    udids,
    addUdid,
    email,
    bundleIdentifier,
    customAppConfig: exp,
  });

  Log.newLine();
  if (addUdid) {
    urlOpts.printQRCode(result.registrationUrl);
    Log.log(
      'Open the following link on your iOS device (or scan the QR code) and follow the instructions to install the development profile:'
    );
    Log.newLine();
    Log.log(chalk.green(`${result.registrationUrl}`));
    Log.newLine();
    Log.log('Please note that you can only register one iOS device per request.');
    Log.log(
      "After you register your device, we'll start building your client, and you'll receive an email when it's ready to install."
    );
  } else {
    urlOpts.printQRCode(result.statusUrl);
    Log.log('Your custom Expo Go app is being built! 🛠');
    Log.log(
      'Open this link on your iOS device (or scan the QR code) to view build logs and install the client:'
    );
    Log.newLine();
    Log.log(chalk.green(`${result.statusUrl}`));
  }
  Log.newLine();
}
