import chalk from 'chalk';
import CliTable from 'cli-table';
import { User } from 'xdl';

import urlOpts from '../../urlOpts';
import * as appleApi from '../build/ios/appleApi';
import { runAction, travelingFastlane } from '../build/ios/appleApi/fastlane';
import selectDistributionCert from './selectDistributionCert';
import selectPushKey from './selectPushKey';
import generateBundleIdentifier from './generateBundleIdentifier';
import { createClientBuildRequest, getExperienceName } from './clientBuildApi';
import log from '../../log';
import prompt from '../../prompt';

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
      log(
        'Custom builds of the Expo Client can only be installed on devices which have been registered with Apple at build-time.'
      );
      log('These devices are currently registered on your Apple Developer account:');
      const table = new CliTable({ head: ['Name', 'Identifier'], style: { head: ['cyan'] } });
      table.push(...devices.map(device => [device.name, device.deviceNumber]));
      log(table.toString());
      const { addUdid } = await prompt({
        name: 'addUdid',
        message: 'Would you like to register new devices to use the Expo Client with?',
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
          'Open the following link on your iOS device (or scan the QR code) and follow the instructions to install the development profile:'
        );
        log.newLine();
        log(chalk.green(`${result.registrationUrl}`));
        log.newLine();
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
};
