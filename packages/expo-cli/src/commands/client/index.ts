import { getConfig, setCustomConfigPath } from '@expo/config';
import { Android, Simulator, UserManager, Versions } from '@expo/xdl';
import chalk from 'chalk';
import CliTable from 'cli-table3';
import { Command } from 'commander';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';

import CommandError from '../../CommandError';
import * as appleApi from '../../appleApi';
import { runAction, travelingFastlane } from '../../appleApi/fastlane';
import { getAppLookupParams } from '../../credentials/api/IosApi';
import { Context } from '../../credentials/context';
import { runCredentialsManager } from '../../credentials/route';
import { CreateIosDist } from '../../credentials/views/IosDistCert';
import { CreateOrReuseProvisioningProfileAdhoc } from '../../credentials/views/IosProvisioningProfileAdhoc';
import { SetupIosDist } from '../../credentials/views/SetupIosDist';
import { SetupIosPush } from '../../credentials/views/SetupIosPush';
import log from '../../log';
import { confirmAsync, promptEmailAsync } from '../../prompts';
import urlOpts from '../../urlOpts';
import * as ClientUpgradeUtils from '../utils/ClientUpgradeUtils';
import { createClientBuildRequest, getExperienceName, isAllowedToBuild } from './clientBuildApi';
import generateBundleIdentifier from './generateBundleIdentifier';

export default function (program: Command) {
  program
    .command('client:ios [path]')
    .helpGroup('experimental')
    .description(
      'Experimental: build a custom version of the Expo client for iOS using your own Apple credentials'
    )
    .longDescription(
      'Build a custom version of the Expo client for iOS using your own Apple credentials and install it on your mobile device using Safari.'
    )
    .option(
      '--apple-id <login>',
      'Apple ID username (please also set the Apple ID password as EXPO_APPLE_PASSWORD environment variable).'
    )
    .asyncActionProjectDir(
      async (
        projectDir: string,
        options: {
          appleId?: string;
          config?: string;
          parent?: {
            nonInteractive: boolean;
          };
        }
      ) => {
        const disabledServices: { [key: string]: { name: string; reason: string } } = {
          pushNotifications: {
            name: 'Push Notifications',
            reason:
              'not yet available until API tokens are supported for the Push Notification system',
          },
        };

        // get custom project manifest if it exists
        // Note: this is the current developer's project, NOT the Expo client's manifest
        const spinner = ora(`Finding custom configuration for the Expo client...`).start();
        if (options.config) {
          setCustomConfigPath(projectDir, options.config);
        }
        const { exp } = getConfig(projectDir, {
          skipSDKVersionRequirement: true,
        });

        if (exp) {
          spinner.succeed(`Found custom configuration for the Expo client`);
        } else {
          spinner.warn(`Unable to find custom configuration for the Expo client`);
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
            path.resolve(projectDir, exp.ios.googleServicesFile!),
            'base64'
          );
          exp.ios.googleServicesFile = contents;
        }

        const user = await UserManager.getCurrentUserAsync();
        const context = new Context();
        await context.init(projectDir, {
          ...options,
          allowAnonymous: true,
          nonInteractive: options.parent?.nonInteractive,
        });
        await context.ensureAppleCtx();
        const appleContext = context.appleCtx;
        if (user) {
          await context.ios.getAllCredentials(user.username); // initialize credentials
        }

        // check if any builds are in flight
        const { isAllowed, errorMessage } = await isAllowedToBuild({
          user,
          appleTeamId: appleContext.team.id,
        });

        if (!isAllowed) {
          throw new CommandError(
            'CLIENT_BUILD_REQUEST_NOT_ALLOWED',
            `New Expo client build request disallowed. Reason: ${errorMessage}`
          );
        }

        const bundleIdentifier = generateBundleIdentifier(appleContext.team.id);
        const experienceName = await getExperienceName({ user, appleTeamId: appleContext.team.id });
        const appLookupParams = getAppLookupParams(experienceName, bundleIdentifier);

        await appleApi.ensureAppExists(appleContext, appLookupParams, {
          enablePushNotifications: true,
        });

        const { devices } = await runAction(travelingFastlane.listDevices, [
          '--all-ios-profile-devices',
          appleContext.appleId,
          appleContext.appleIdPassword,
          appleContext.team.id,
        ]);
        const udids = devices.map((device: { deviceNumber?: string }) => device.deviceNumber);

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
          log.newLine();
          log.warn('These services will be disabled in your custom Expo client:');
          const table = new CliTable({ head: ['Service', 'Reason'], style: { head: ['cyan'] } });
          table.push(
            ...Object.keys(disabledServices).map(serviceKey => {
              const service = disabledServices[serviceKey];
              return [service.name, service.reason];
            })
          );
          log(table.toString());
          log(
            'See https://docs.expo.io/guides/adhoc-builds/#optional-additional-configuration-steps for more details.'
          );
        }

        let email;
        if (user) {
          email = user.email;
        } else {
          email = await promptEmailAsync({
            message: 'Please enter an email address to notify, when the build is completed:',
            initial: context?.user?.email,
          });
        }
        log.newLine();

        let addUdid;
        if (udids.length === 0) {
          log(
            'There are no devices registered to your Apple Developer account. Please follow the instructions below to register an iOS device.'
          );
          addUdid = true;
        } else {
          log(
            'Custom builds of the Expo client can only be installed on devices which have been registered with Apple at build-time.'
          );
          log('These devices are currently registered on your Apple Developer account:');
          const table = new CliTable({ head: ['Name', 'Identifier'], style: { head: ['cyan'] } });
          table.push(
            ...devices.map((device: { name: string; deviceNumber: string | number }) => [
              device.name,
              device.deviceNumber,
            ])
          );
          log(table.toString());

          const udidPrompt = await confirmAsync({
            message: 'Would you like to register a new device to use the Expo client with?',
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

        log.newLine();
        if (addUdid) {
          urlOpts.printQRCode(result.registrationUrl);
          log(
            'Open the following link on your iOS device (or scan the QR code) and follow the instructions to install the development profile:'
          );
          log.newLine();
          log(chalk.green(`${result.registrationUrl}`));
          log.newLine();
          log('Please note that you can only register one iOS device per request.');
          log(
            "After you register your device, we'll start building your client, and you'll receive an email when it's ready to install."
          );
        } else {
          urlOpts.printQRCode(result.statusUrl);
          log('Your custom Expo client is being built! 🛠');
          log(
            'Open this link on your iOS device (or scan the QR code) to view build logs and install the client:'
          );
          log.newLine();
          log(chalk.green(`${result.statusUrl}`));
        }
        log.newLine();
      }
    );

  program
    .command('client:install:ios')
    .description('Install the Expo client for iOS on the simulator')
    .option(
      '--latest',
      `Install the latest version of Expo client, ignoring the current project version.`
    )
    .helpGroup('client')
    .asyncAction(async (command: Command) => {
      const forceLatest = !!command.latest;
      const currentSdkConfig = await ClientUpgradeUtils.getExpoSdkConfig(process.cwd());
      const currentSdkVersion = currentSdkConfig ? currentSdkConfig.sdkVersion : undefined;
      const sdkVersions = await Versions.sdkVersionsAsync();
      const latestSdk = await Versions.newestReleasedSdkVersionAsync();
      const currentSdk = sdkVersions[currentSdkVersion!];
      const recommendedClient = ClientUpgradeUtils.getClient('ios', currentSdk);
      const latestClient = ClientUpgradeUtils.getClient('ios', latestSdk.data);

      if (forceLatest) {
        if (!latestClient?.url) {
          log.error(
            `Unable to find latest client version. Check your internet connection or run this command again without the ${chalk.bold(
              '--latest'
            )} flag.`
          );
          return;
        }

        if (
          await Simulator.upgradeExpoAsync({ url: latestClient.url, version: latestClient.version })
        ) {
          log('Done!');
        } else {
          log.error(`Unable to install Expo client ${latestClient.version} for iOS.`);
        }
        return;
      }

      if (!currentSdkVersion) {
        log(
          'Could not find your Expo project. If you run this from a project, we can help pick the right Expo client version!'
        );
      }

      if (currentSdk && !recommendedClient) {
        log(
          `You are currently using SDK ${currentSdkVersion}. Unfortunately, we couldn't detect the proper client version for this SDK.`
        );
      }

      if (currentSdk && recommendedClient) {
        const recommendedClientVersion = recommendedClient.version || 'version unknown';
        const answer = await confirmAsync({
          message: `You are currently using SDK ${currentSdkVersion}. Would you like to install client ${recommendedClientVersion} released for this SDK?`,
        });
        if (answer) {
          await Simulator.upgradeExpoAsync({
            url: recommendedClient.url,
            version: recommendedClient.version,
          });
          log('Done!');
          return;
        }
      } else {
        const answer = await confirmAsync({
          message: latestClient?.version
            ? chalk`Do you want to install the latest client? {dim (${latestClient.version})}`
            : 'Do you want to install the latest client?',
        });
        if (answer) {
          await Simulator.upgradeExpoAsync({
            url: latestClient?.url,
            version: latestClient?.version,
          });
          log('Done!');
          return;
        }
      }

      const availableClients = ClientUpgradeUtils.getAvailableClients({
        sdkVersions,
        project: currentSdkConfig,
        platform: 'ios',
      });

      if (availableClients.length === 0) {
        const answer = await confirmAsync({
          message: currentSdk
            ? `We don't have a compatible client for SDK ${currentSdkVersion}. Do you want to try the latest client?`
            : "It looks like we don't have a compatible client. Do you want to try the latest client?",
        });
        if (answer) {
          await Simulator.upgradeExpoAsync({
            url: latestClient?.url,
            version: latestClient?.version,
          });
          log('Done!');
        } else {
          log('No client to install');
        }
        return;
      }

      const targetClient = await ClientUpgradeUtils.askClientToInstall({
        currentSdkVersion,
        latestSdkVersion: latestSdk.version,
        clients: availableClients,
      });

      if (await Simulator.upgradeExpoAsync({ url: targetClient.clientUrl })) {
        log('Done!');
      }
    });

  program
    .command('client:install:android')
    .description('Install the Expo client for Android on a connected device or emulator')
    .option(
      '--latest',
      `Install the latest version of Expo client, ignore the current project version.`
    )
    .helpGroup('client')
    .asyncAction(async (command: Command) => {
      const forceLatest = !!command.latest;
      const currentSdkConfig = await ClientUpgradeUtils.getExpoSdkConfig(process.cwd());
      const currentSdkVersion = currentSdkConfig ? currentSdkConfig.sdkVersion : undefined;
      const sdkVersions = await Versions.sdkVersionsAsync();
      const latestSdk = await Versions.newestReleasedSdkVersionAsync();
      const currentSdk = sdkVersions[currentSdkVersion!];
      const recommendedClient = ClientUpgradeUtils.getClient('android', currentSdk);
      const latestClient = ClientUpgradeUtils.getClient('android', latestSdk.data);

      if (forceLatest) {
        if (!latestClient?.url) {
          log.error(
            `Unable to find latest client version. Check your internet connection or run this command again without the ${chalk.bold(
              '--latest'
            )} flag.`
          );
          return;
        }

        if (
          await Android.upgradeExpoAsync({ url: latestClient.url, version: latestClient.version })
        ) {
          log('Done!');
        } else {
          log.error(`Unable to install Expo client ${latestClient.version} for Android.`);
        }

        return;
      }

      if (!currentSdkVersion) {
        log(
          'Could not find your Expo project. If you run this from a project, we can help pick the right Expo client version!'
        );
      }

      if (currentSdk && !recommendedClient) {
        log(
          `You are currently using SDK ${currentSdkVersion}. Unfortunately, we couldn't detect the proper client version for this SDK.`
        );
      }

      if (currentSdk && recommendedClient) {
        const recommendedClientVersion = recommendedClient.version || 'version unknown';
        const answer = await confirmAsync({
          message: `You are currently using SDK ${currentSdkVersion}. Would you like to install client ${recommendedClientVersion} released for this SDK?`,
        });
        if (answer) {
          await Android.upgradeExpoAsync({
            url: recommendedClient.url,
            version: recommendedClient.version,
          });
          log('Done!');
          return;
        }
      } else {
        const answer = await confirmAsync({
          message: latestClient?.version
            ? chalk`Do you want to install the latest client? {dim (${latestClient.version})}`
            : 'Do you want to install the latest client?',
        });
        if (answer) {
          await Android.upgradeExpoAsync({
            url: latestClient?.url,
            version: latestClient?.version,
          });
          log('Done!');
          return;
        }
      }

      const availableClients = ClientUpgradeUtils.getAvailableClients({
        sdkVersions,
        project: currentSdkConfig,
        platform: 'android',
      });

      if (availableClients.length === 0) {
        const answer = await confirmAsync({
          message: currentSdk
            ? `We don't have a compatible client for SDK ${currentSdkVersion}. Do you want to try the latest client?`
            : "It looks like we don't have a compatible client. Do you want to try the latest client?",
        });
        if (answer) {
          await Android.upgradeExpoAsync({
            url: latestClient?.url,
            version: latestClient?.version,
          });
          log('Done!');
        } else {
          log('No client to install');
        }
        return;
      }

      const targetClient = await ClientUpgradeUtils.askClientToInstall({
        currentSdkVersion,
        latestSdkVersion: latestSdk.version,
        clients: availableClients,
      });

      if (await Android.upgradeExpoAsync({ url: targetClient.clientUrl })) {
        log('Done!');
      }
    });
}
