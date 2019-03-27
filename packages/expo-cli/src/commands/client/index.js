import chalk from 'chalk';
import CliTable from 'cli-table';
import { Android, Simulator, User } from 'xdl';

import urlOpts from '../../urlOpts';
import * as appleApi from '../build/ios/appleApi';
import { runAction, travelingFastlane } from '../build/ios/appleApi/fastlane';
import selectDistributionCert from './selectDistributionCert';
import selectPushKey from './selectPushKey';
import generateBundleIdentifier from './generateBundleIdentifier';
import createClientBuildRequest from './createClientBuildRequest';
import log from '../../log';
import prompt from '../../prompt';

export default program => {
  program
    .command('client:ios')
    .option(
      '--apple-id <login>',
      'Apple ID username (please also set the Apple ID password as EXPO_APPLE_PASSWORD environment variable).'
    )
    .asyncAction(async options => {
      const authData = await appleApi.authenticate(options);
      const user = await User.getCurrentUserAsync();
      const bundleIdentifier = generateBundleIdentifier(authData.team.id);
      const context = {
        ...authData,
        bundleIdentifier,
        experienceName: 'Expo',
        username: user ? user.username : null,
      };
      await appleApi.ensureAppExists(context);

      const distributionCert = await selectDistributionCert(context);
      const pushKey = await selectPushKey(context);

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
        context.appleId,
        context.appleIdPassword,
        context.team.id,
      ]);
      const udids = devices.map(device => device.deviceNumber);
      log.newLine();
      log('These devices are currently registered on your Apple Developer account:');
      const table = new CliTable({ head: ['Name', 'Identifier'], style: { head: ['cyan'] } });
      table.push(...devices.map(device => [device.name, device.deviceNumber]));
      log(table.toString());
      const { addUdid } = await prompt({
        name: 'addUdid',
        message: 'Would you like to register new devices to use Expo Client with?',
        type: 'confirm',
        default: true,
      });

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
          chalk.green(
            `Open this link on iOS to register the device and install the client:\n\n${
              result.registrationUrl
            }`
          )
        );
        log.newLine();
      } else {
        urlOpts.printQRCode(result.statusUrl);
        log(chalk.green(`Open this link on iOS to install the client:\n\n${result.statusUrl}`));
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
