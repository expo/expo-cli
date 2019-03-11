import { Credentials, User } from 'xdl';

import * as appleApi from '../build/ios/appleApi';
import * as credentials from '../build/ios/credentials';
import promptForCredentials from '../build/ios/credentials/prompt/promptForCredentials';
import selectDistributionCert from './selectDistributionCert';
import selectPushKey from './selectPushKey';
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
      let context = { ...authData, username: user ? user.username : null };
      let distributionCert = await selectDistributionCert(context);
      let pushKey = await selectPushKey(context);
      let { notificationEmail } = await prompt({
        name: 'notificationEmail',
        message: 'Email address to notify, when the build is completed:',
        default: user ? user.email : undefined,
        filter: value => value.trim(),
        validate: value =>
          !value || /@/.test(value) ? true : "That doesn't look like a valid email.",
      });
      if (!notificationEmail) {
        log('Email address was empty, notifications disabled for this build.');
        notificationEmail = null;
      }
    });
};
