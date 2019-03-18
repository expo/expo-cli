import chalk from 'chalk';
import CliTable from 'cli-table';
import { Credentials, User } from 'xdl';

import urlOpts from '../../urlOpts';
import * as appleApi from '../build/ios/appleApi';
import { runAction, travelingFastlane } from '../build/ios/appleApi/fastlane';
import * as credentials from '../build/ios/credentials';
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
      let authData = await appleApi.authenticate(options);
      let user = await User.getCurrentUserAsync();
      let bundleIdentifier = generateBundleIdentifier(authData.team.id);
      let context = {
        ...authData,
        bundleIdentifier,
        experienceName: 'Expo',
        username: user ? user.username : null,
      };
      await appleApi.ensureAppExists(context);

      let distributionCert = await selectDistributionCert(context);
      let pushKey = await selectPushKey(context);

      let email;
      if (user) {
        email = user.email;
      } else {
        ({ email } = await prompt({
          name: 'email',
          message: 'Please enter an email address to notify, when the build is completed:',
          filter: value => value.trim(),
          validate: value => (/@/.test(value) ? true : "That doesn't look like a valid email."),
        }));
      }

      let { devices } = await runAction(travelingFastlane.listDevices, [
        context.appleId,
        context.appleIdPassword,
        context.team.id,
      ]);
      let udids = devices.map(device => device.deviceNumber);
      log('These devices are currently registered on your Apple Developer account:');
      let table = new CliTable({ head: ['Name', 'Identifier'] });
      table.push(...devices.map(device => [device.name, device.deviceNumber]));
      log(table.toString());
      let { addUdid } = await prompt({
        name: 'addUdid',
        message: 'Would you like to register new devices to use Expo Client with?',
        type: 'confirm',
        default: true,
      });

      let result = await createClientBuildRequest({
        user,
        context,
        distributionCert,
        udids,
        addUdid,
        email,
      });

      log.newLine();
      if (addUdid) {
        urlOpts.printQRCode(result.registrationUrl);
        log(
          chalk.green(
            `Please visit this link on your device to register its UDID and download Expo Client:\n. ${
              result.registrationUrl
            }`
          )
        );
        log.newLine();
      } else {
        log(
          chalk.green(`Build started! You will receive an email to ${email} when it's finished.`)
        );
      }
    });
};
