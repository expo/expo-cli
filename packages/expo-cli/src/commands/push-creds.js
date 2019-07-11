/**
 * @flow
 */

import { ApiV2, Exp, UserManager } from '@expo/xdl';

import log from '../log';

export default (program: any) => {
  program
    .command('push:android:upload [project-dir]')
    .description('Uploads a Firebase Cloud Messaging key for Android push notifications.')
    .option('--api-key [api-key]', 'Server API key for FCM.')
    .asyncActionProjectDir(async (projectDir, options) => {
      if (!options.apiKey || options.apiKey.length === 0) {
        throw new Error('Must specify an API key to upload with --api-key.');
      }

      log('Reading project configuration...');

      const {
        args: { remotePackageName },
      } = await Exp.getPublishInfoAsync(projectDir);

      log('Logging in...');

      let user = await UserManager.getCurrentUserAsync();
      let apiClient = ApiV2.clientForUser(user);

      log("Setting API key on Expo's servers...");

      await apiClient.putAsync(`credentials/push/android/${remotePackageName}`, {
        fcmApiKey: options.apiKey,
      });

      log('All done!');
    }, true);

  program
    .command('push:android:show [project-dir]')
    .description('Print the value currently in use for FCM notifications for this project.')
    .asyncActionProjectDir(async (projectDir, options) => {
      const {
        args: { remotePackageName },
      } = await Exp.getPublishInfoAsync(projectDir);
      let user = await UserManager.getCurrentUserAsync();
      let apiClient = ApiV2.clientForUser(user);

      let result = await apiClient.getAsync(`credentials/push/android/${remotePackageName}`);

      if (result.status === 'ok' && result.fcmApiKey) {
        console.log(JSON.stringify(result));
      } else {
        throw new Error('Server returned an invalid result!');
      }
    }, true);

  program
    .command('push:android:clear [project-dir]')
    .description('Deletes a previously uploaded FCM credential.')
    .asyncActionProjectDir(async (projectDir, options) => {
      log('Reading project configuration...');
      const {
        args: { remotePackageName },
      } = await Exp.getPublishInfoAsync(projectDir);

      log('Logging in...');
      let user = await UserManager.getCurrentUserAsync();
      let apiClient = ApiV2.clientForUser(user);

      log("Deleting API key from Expo's servers...");

      await apiClient.deleteAsync(`credentials/push/android/${remotePackageName}`);

      log('All done!');
    }, true);

  program
    .command('push:web:upload [project-dir]')
    .description('Uploads a VAPID key for web push notifications.')
    .option('--vapid-pubkey [vapid-public-key]', 'URL-safe base64-encoded VAPID public key.')
    .option('--vapid-pvtkey [vapid-private-key]', 'URL-safe base64-encoded VAPID private key.')
    .option(
      '--vapid-subject [vapid-subject]',
      'URL or `mailto:` URL which provides a point of contact in case the push service needs to contact the message sender.'
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      if (!options.vapidPubkey || !options.vapidPvtkey || !options.vapidSubject) {
        throw new Error(
          'Must specify all three fields (--vapid-pubkey, --vapid-pvtkey, and --vapid-subject) to upload.'
        );
      }

      log('Reading project configuration...');

      const {
        args: { remotePackageName },
      } = await Exp.getPublishInfoAsync(projectDir);

      log('Logging in...');

      let user = await UserManager.getCurrentUserAsync();
      let apiClient = ApiV2.clientForUser(user);

      log("Setting VAPID key on Expo's servers...");

      await apiClient.putAsync(`credentials/push/web/${remotePackageName}`, {
        vapidPublicKey: options.vapidPubkey,
        vapidPrivateKey: options.vapidPvtkey,
        vapidSubject: options.vapidSubject,
      });

      log('All done!');
    }, true);
};
