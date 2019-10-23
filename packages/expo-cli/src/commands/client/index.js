import * as ConfigUtils from '@expo/config';
import { Android, Credentials, Simulator, UserManager, Versions } from '@expo/xdl';
import chalk from 'chalk';
import CliTable from 'cli-table';
import fs from 'fs-extra';
import _ from 'lodash';
import ora from 'ora';
import path from 'path';

import CommandError from '../../CommandError';
import log from '../../log';
import prompt from '../../prompt';
import urlOpts from '../../urlOpts';
import { PLATFORMS } from '../build/constants';
<<<<<<< HEAD
import * as appleApi from '../../appleApi';
import { runAction, travelingFastlane } from '../../appleApi/fastlane';
=======
import * as appleApi from '../build/ios/appleApi';
import { runAction, travelingFastlane } from '../build/ios/appleApi/fastlane';
import { findProjectRootAsync } from '../utils/ProjectUtils';
>>>>>>> refactor(expo-cli): add guide to install simulator clients
import { createClientBuildRequest, getExperienceName, isAllowedToBuild } from './clientBuildApi';
import generateBundleIdentifier from './generateBundleIdentifier';
import selectAdhocProvisioningProfile from './selectAdhocProvisioningProfile';
import selectDistributionCert from './selectDistributionCert';
import selectPushKey from './selectPushKey';
import { Updater, clearTags } from './tagger';

const { IOS } = PLATFORMS;

export default program => {
  program
    .command('client:ios [project-dir]')
    .option(
      '--apple-id <login>',
      'Apple ID username (please also set the Apple ID password as EXPO_APPLE_PASSWORD environment variable).'
    )
    .description(
      'Build a custom version of the Expo Client for iOS using your own Apple credentials and install it on your mobile device using Safari.'
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      const disabledServices = {
        pushNotifications: {
          name: 'Push Notifications',
          reason:
            'not yet available until API tokens are supported for the Push Notification system',
        },
      };

      // get custom project manifest if it exists
      // Note: this is the current developer's project, NOT the Expo client's manifest
      const spinner = ora(`Finding custom configuration for the Expo client...`).start();
      const appJsonPath = options.config || path.join(projectDir, 'app.json');
      const appJsonExists = await ConfigUtils.fileExistsAsync(appJsonPath);
      const { exp } = appJsonExists ? await ConfigUtils.readConfigJsonAsync(projectDir) : {};

      if (exp) {
        spinner.succeed(`Found custom configuration for the Expo client at ${appJsonPath}`);
      } else {
        spinner.warn(`Unable to find custom configuration for the Expo client`);
      }
      if (!_.has(exp, 'ios.config.googleMapsApiKey')) {
        const disabledReason = exp
          ? `ios.config.googleMapsApiKey does not exist in configuration file found in ${appJsonPath}`
          : 'No custom configuration file could be found. You will need to provide a json file with a valid ios.config.googleMapsApiKey field.';
        disabledServices.googleMaps = { name: 'Google Maps', reason: disabledReason };
      }
      if (_.has(exp, 'ios.googleServicesFile')) {
        const contents = await fs.readFile(
          path.resolve(projectDir, exp.ios.googleServicesFile),
          'base64'
        );
        exp.ios.googleServicesFile = contents;
      }

      const authData = await appleApi.authenticate(options);
      const user = await UserManager.getCurrentUserAsync();

      // check if any builds are in flight
      const { isAllowed, errorMessage } = await isAllowedToBuild({
        user,
        appleTeamId: authData.team.id,
      });

      if (!isAllowed) {
        throw new CommandError(
          'CLIENT_BUILD_REQUEST_NOT_ALLOWED',
          `New Expo Client build request disallowed. Reason: ${errorMessage}`
        );
      }

      const bundleIdentifier = generateBundleIdentifier(authData.team.id);
      const experienceName = await getExperienceName({ user, appleTeamId: authData.team.id });
      const context = {
        ...authData,
        username: user ? user.username : null,
      };
      await appleApi.ensureAppExists(
        context,
        { bundleIdentifier, experienceName },
        { enablePushNotifications: true }
      );

      const { devices } = await runAction(travelingFastlane.listDevices, [
        '--all-ios-profile-devices',
        context.appleId,
        context.appleIdPassword,
        context.team.id,
      ]);
      const udids = devices.map(device => device.deviceNumber);

      const distributionCert = await selectDistributionCert(context);
      const pushKey = await selectPushKey(context);
      const provisioningProfile = await selectAdhocProvisioningProfile(
        context,
        udids,
        bundleIdentifier,
        distributionCert.distCertSerialNumber
      );

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
        log.warn('These services will be disabled in your custom Expo Client:');
        const table = new CliTable({ head: ['Service', 'Reason'], style: { head: ['cyan'] } });
        table.push(
          ...Object.keys(disabledServices).map(serviceKey => {
            const service = disabledServices[serviceKey];
            return [service.name, service.reason];
          })
        );
        log(table.toString());
        log(
          'See https://docs.expo.io/versions/latest/guides/adhoc-builds/#optional-additional-configuration-steps for more details.'
        );
      }

      // if user is logged in, then we should update credentials
      const credentialsList = [distributionCert, pushKey, provisioningProfile].filter(i => i);
      if (user) {
        // store all the credentials that we mark for update
        const updateCredentialsFn = async listOfCredentials => {
          if (listOfCredentials.length === 0) {
            return;
          }
          const credentials = listOfCredentials.reduce(
            (acc, credential) => {
              return { ...acc, ...credential };
            },
            { teamId: context.team.id }
          );
          await Credentials.updateCredentialsForPlatform(IOS, credentials, [], {
            username: user.username,
            experienceName,
            bundleIdentifier,
          });
        };
        const CredentialsUpdater = new Updater(updateCredentialsFn);
        await CredentialsUpdater.updateAllAsync(credentialsList);
      } else {
        // clear update tags, we dont store credentials for anonymous users
        clearTags(credentialsList);
      }

      let email;
      if (user) {
        email = user.email;
      } else {
        ({ email } = await prompt({
          name: 'email',
          message: 'Please enter an email address to notify, when the build is completed:',
          filter: value => value.trim(),
          validate: value => (/.+@.+/.test(value) ? true : "That doesn't look like a valid email."),
        }));
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
          'Custom builds of the Expo Client can only be installed on devices which have been registered with Apple at build-time.'
        );
        log('These devices are currently registered on your Apple Developer account:');
        const table = new CliTable({ head: ['Name', 'Identifier'], style: { head: ['cyan'] } });
        table.push(...devices.map(device => [device.name, device.deviceNumber]));
        log(table.toString());

        const udidPrompt = await prompt({
          name: 'addUdid',
          message: 'Would you like to register a new device to use the Expo Client with?',
          type: 'confirm',
          default: true,
        });
        addUdid = udidPrompt.addUdid;
      }

      const result = await createClientBuildRequest({
        user,
        context,
        distributionCert,
        provisioningProfile,
        pushKey,
        udids,
        addUdid,
        email,
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
        log('Your custom Expo Client is being built! 🛠');
        log(
          'Open this link on your iOS device (or scan the QR code) to view build logs and install the client:'
        );
        log.newLine();
        log(chalk.green(`${result.statusUrl}`));
      }
      log.newLine();
    }, true);

  program
    .command('client:install:ios')
    .description('Install the Expo Client for iOS on the simulator')
    .asyncAction(async () => {
      let currentSdkVersionString;
      const getIosVersion = sdkVersion => sdkVersion.iosClientVersion || sdkVersion.iosVersion;

      try {
        const { projectRoot } = await findProjectRootAsync(process.cwd());
        const { exp } = await ConfigUtils.readConfigJsonAsync(projectRoot);
        currentSdkVersionString = exp.sdkVersion;
      } catch (error) {
        // When a developer runs the installs command outside the project,
        // they should be able to install any version
        if (error.code !== 'NO_PROJECT') {
          throw error;
        }
        log(
          'Could not find your Expo project. If you run this command from a project, we can help pick the right Expo Client version!'
        );
      }

      let targetSdkVersion;
      let targetSdkVersionString;

      const latestSdk = await Versions.newestSdkVersionAsync();
      const sdkVersions = await Versions.sdkVersionsAsync();
      const currentSdkVersion = currentSdkVersionString
        ? sdkVersions[currentSdkVersionString]
        : null;

      if (!currentSdkVersionString || currentSdkVersionString === latestSdk.version) {
        const answer = await prompt({
          type: 'confirm',
          name: 'updateToLatestClient',
          message:
            currentSdkVersionString === latestSdk.version
              ? 'You are using the latest SDK. Do you want to install the latest client?'
              : 'Do you want to install the latest client?',
        });
        if (answer.updateToLatestClient) {
          await Simulator.upgradeExpoAsync();
          log('Done!');
          return;
        }
      } else if (currentSdkVersion && currentSdkVersion.iosClientUrl) {
        const answer = await prompt({
          type: 'confirm',
          name: 'updateToRecommendedVersion',
          message: `You are currently using SDK ${currentSdkVersionString}. Would you like to install the client version ${getIosVersion(
            currentSdkVersion
          )} released for this SDK?`,
        });
        if (answer.updateToRecommendedVersion) {
          targetSdkVersion = currentSdkVersion;
          targetSdkVersionString = currentSdkVersionString;
        }
      } else {
        log(
          `You are currently using SDK ${currentSdkVersionString}. Unfortunately, we couldn't detect the proper client version for this SDK.`
        );
      }

      if (!targetSdkVersion) {
        const sdkVersionStringOptions = Object.keys(sdkVersions)
          .reverse()
          .filter(
            version => !sdkVersions[version].isDeprecated && sdkVersions[version].iosClientUrl
          );
        const answer = await prompt({
          type: 'list',
          name: 'selectedSdkVersionString',
          message: 'Choose an SDK version to install the client for:',
          pageSize: 20,
          choices: sdkVersionStringOptions.map(optionSdkVersionString => {
            const optionSdkVersion = sdkVersions[optionSdkVersionString];
            return {
              value: optionSdkVersionString,
              name: `${chalk.bold(optionSdkVersionString)} ${chalk.grey(
                `- client ${getIosVersion(optionSdkVersion)}`
              )}`,
            };
          }),
        });

        targetSdkVersion = sdkVersions[answer.selectedSdkVersionString];
        targetSdkVersionString = answer.selectedSdkVersionString;
      }

      if (await Simulator.upgradeExpoAsync(targetSdkVersion.iosClientUrl)) {
        log(
          `Done! We installed the client for SDK ${targetSdkVersionString}, version ${getIosVersion(
            targetSdkVersion
          )}`
        );
      }
    }, true);

  program
    .command('client:install:android')
    .description(
      'Install the latest version of Expo Client for Android on a connected device or emulator'
    )
    .asyncAction(async () => {
      if (await Android.upgradeExpoAsync()) {
        log('Done!');
      }
    }, true);
};
