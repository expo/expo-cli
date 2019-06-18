import chalk from 'chalk';
import CliTable from 'cli-table';
import { Android, Simulator, User, Credentials } from '@expo/xdl';

import CommandError from '../../CommandError';
import urlOpts from '../../urlOpts';
import * as appleApi from '../build/ios/appleApi';
import { PLATFORMS } from '../build/constants';
import { runAction, travelingFastlane } from '../build/ios/appleApi/fastlane';
import selectDistributionCert from './selectDistributionCert';
import selectPushKey from './selectPushKey';
import generateBundleIdentifier from './generateBundleIdentifier';
import { createClientBuildRequest, getExperienceName, isAllowedToBuild } from './clientBuildApi';
import log from '../../log';
import prompt from '../../prompt';
import { Updater, clearTags } from './tagger';

const { IOS } = PLATFORMS;

export default program => {
  program
    .command('client:ios')
    .option(
      '--apple-id <login>',
      'Apple ID username (please also set the Apple ID password as EXPO_APPLE_PASSWORD environment variable).'
    )
    .description(
      'Build a custom version of the Expo Client for iOS using your own Apple credentials and install it on your mobile device using Safari.'
    )
    .asyncAction(async options => {
      const authData = await appleApi.authenticate(options);
      const user = await User.getCurrentUserAsync();

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
        bundleIdentifier,
        experienceName,
        username: user ? user.username : null,
      };
      await appleApi.ensureAppExists(context);

      const distributionCert = await selectDistributionCert(context);
      const pushKey = await selectPushKey(context);

      if (pushKey === null) {
        log(
          `Push notifications will be disabled until you upload your push credentials. See https://docs.expo.io/versions/latest/guides/adhoc-builds/#push-notifications-arent-working for more details.`
        );
      }

      // if user is logged in, then we should update credentials
      const credentialsList = [distributionCert, pushKey].filter(i => i);
      if (user) {
        // store all the credentials that we mark for update
        const updateCredentialsFn = async listOfCredentials => {
          if (listOfCredentials.length === 0) {
            return;
          }
          const credentials = listOfCredentials.reduce((acc, credential) => {
            return { ...acc, ...credential };
          });
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

      const { devices } = await runAction(travelingFastlane.listDevices, [
        '--all-ios-profile-devices',
        context.appleId,
        context.appleIdPassword,
        context.team.id,
      ]);
      const udids = devices.map(device => device.deviceNumber);
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
        pushKey,
        udids,
        addUdid,
        email,
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
    });

  program
    .command('client:install:ios')
    .description('Install the latest version of Expo Client for iOS on the simulator')
    .asyncAction(async () => {
      if (await Simulator.upgradeExpoAsync()) {
        log('Done!');
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
