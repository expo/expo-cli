/**
 * @flow
 */

import fse from 'fs-extra';
import chalk from 'chalk';
import { ApiV2, Exp, UserManager } from '@expo/xdl';
import * as ConfigUtils from '@expo/config';

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

  const vapidSubjectDescription =
    'URL or `mailto:` URL which provides a point of contact in case the push service needs to contact the message sender.';

  program
    .command('push:web:upload [project-dir]')
    .description('Uploads VAPID key pair and VAPID subject for web push notifications.')
    .option('--vapid-pubkey [vapid-public-key]', 'URL-safe base64-encoded VAPID public key.')
    .option('--vapid-pvtkey [vapid-private-key]', 'URL-safe base64-encoded VAPID private key.')
    .option('--vapid-subject [vapid-subject]', vapidSubjectDescription)
    .asyncActionProjectDir(async (projectDir, options) => {
      if (!options.vapidPubkey || !options.vapidPvtkey || !options.vapidSubject) {
        throw new Error(
          'Must specify all three fields (--vapid-pubkey, --vapid-pvtkey, and --vapid-subject) to upload.'
        );
      }

      await _uploadWebPushCredientials(projectDir, options);
    }, true);

  program
    .command('push:web:generate [project-dir]')
    .description('Generates VAPID key pair for web push notifications.')
    .option('--vapid-subject [vapid-subject]', vapidSubjectDescription)
    .asyncActionProjectDir(async (projectDir, options) => {
      if (!options.vapidSubject) {
        throw new Error('Must specify --vapid-subject.');
      }

      const results = await _uploadWebPushCredientials(projectDir, options);
      log(`Your VAPID public key is: ${results.vapidPublicKey}`);
      log(`Your VAPID private key is: ${results.vapidPrivateKey}`);
    }, true);

  program
    .command('push:web:show [project-dir]')
    .description(
      'Prints the VAPID public key, the VAPID private key, and the VAPID subject currently in use for web notifications for this project.'
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      const {
        args: { remotePackageName },
      } = await Exp.getPublishInfoAsync(projectDir);
      const user = await UserManager.getCurrentUserAsync();
      const apiClient = ApiV2.clientForUser(user);

      const result = await apiClient.getAsync(`credentials/push/web/${remotePackageName}`);

      if (
        result.status === 'ok' &&
        result.vapidPublicKey &&
        result.vapidPrivateKey &&
        result.vapidSubject
      ) {
        log(JSON.stringify(result));
      } else if (result.status === 'error') {
        throw new Error(`Server returned an error: ${result.error}`);
      } else {
        throw new Error('Server returned an invalid result!');
      }
    }, true);

  program
    .command('push:web:clear [project-dir]')
    .description(
      'Deletes previously uploaded VAPID public key, VAPID private key, and VAPID subject.'
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      log('Reading project configuration...');
      const {
        args: { remotePackageName },
      } = await Exp.getPublishInfoAsync(projectDir);

      log('Logging in...');
      const user = await UserManager.getCurrentUserAsync();
      const apiClient = ApiV2.clientForUser(user);

      log("Deleting API key from Expo's servers...");

      await apiClient.deleteAsync(`credentials/push/web/${remotePackageName}`);
    }, true);
};

async function _uploadWebPushCredientials(projectDir, options) {
  const isGeneration = !(options.vapidPubkey && options.vapidPvtkey);

  log('Reading project configuration...');

  const {
    args: { remotePackageName },
  } = await Exp.getPublishInfoAsync(projectDir);

  log('Logging in...');

  const user = await UserManager.getCurrentUserAsync();
  const apiClient = ApiV2.clientForUser(user);

  if (isGeneration) {
    log("Generating and setting VAPID keys on Expo's servers...");
  } else {
    log("Uploading VAPID keys to Expo's servers...");
  }

  const results = await apiClient.putAsync(`credentials/push/web/${remotePackageName}`, {
    vapidPublicKey: options.vapidPubkey,
    vapidPrivateKey: options.vapidPvtkey,
    vapidSubject: options.vapidSubject,
  });

  /**
   * Customize app.json
   */
  log(`Reading app.json...`);
  const { configPath } = await ConfigUtils.findConfigFileAsync(projectDir);
  const appJson = JSON.parse(await fse.readFile(configPath));
  let changedProperties = [];

  if (appJson.expo.owner && appJson.expo.owner !== user.username) {
    log(
      chalk.cyan(
        `expo.owner is already configured to be "${
          appJson.expo.owner
        }" in app.json, but your current username is "${
          user.username
        }". We will replace it with your current username.`
      )
    );
  }
  appJson.expo.owner = user.username;
  changedProperties.push('expo.owner');

  if (
    appJson.expo.notification &&
    appJson.expo.notification.vapidPublicKey &&
    appJson.expo.notification.vapidPublicKey !== results.vapidPublicKey
  ) {
    log(
      chalk.cyan(
        `expo.notification.vapidPublicKey is already configured in app.json (${
          appJson.expo.notification.vapidPublicKey
        }), but it is different from the VAPID public key you just ${
          isGeneration ? `generated` : `uploaded`
        }. We will replace it with the new VAPID public key.`
      )
    );
  }
  if (!appJson.expo.notification) {
    appJson.expo.notification = {};
  }
  appJson.expo.notification.vapidPublicKey = results.vapidPublicKey;
  changedProperties.push('expo.notification.vapidPublicKey');

  if (changedProperties.length) {
    log(`Writing app.json...`);
    await fse.writeFile(configPath, JSON.stringify(appJson, null, 2));
    log(chalk.green(`Wrote ${changedProperties.join(', ')} to app.json.`));
  }

  log(chalk.green('All done!'));

  return results;
}
