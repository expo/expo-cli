import fse from 'fs-extra';
import chalk from 'chalk';
import { Command } from 'commander';
import { ApiV2, Exp, UserManager } from '@expo/xdl';
import * as ConfigUtils from '@expo/config';

import log from '../log';

type VapidData = {
  vapidSubject: string;
  vapidPubkey?: string;
  vapidPvtkey?: string;
};

export default function (program: Command) {
  program
    .command('push:android:upload [project-dir]')
    .description('Uploads a Firebase Cloud Messaging key for Android push notifications.')
    .option('--api-key [api-key]', 'Server API key for FCM.')
    .asyncActionProjectDir(async (projectDir: string, options: { apiKey?: string }) => {
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
    });

  program
    .command('push:android:show [project-dir]')
    .description('Print the value currently in use for FCM notifications for this project.')
    .asyncActionProjectDir(async (projectDir: string) => {
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
    });

  program
    .command('push:android:clear [project-dir]')
    .description('Deletes a previously uploaded FCM credential.')
    .asyncActionProjectDir(async (projectDir: string) => {
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
    });

  const vapidSubjectDescription =
    'URL or `mailto:` URL which provides a point of contact in case the push service needs to contact the message sender.';

  program
    .command('push:web:upload [project-dir]')
    .description('Uploads VAPID key pair and VAPID subject for web push notifications.')
    .option('--vapid-pubkey [vapid-public-key]', 'URL-safe base64-encoded VAPID public key.')
    .option('--vapid-pvtkey [vapid-private-key]', 'URL-safe base64-encoded VAPID private key.')
    .option('--vapid-subject [vapid-subject]', vapidSubjectDescription)
    .asyncActionProjectDir(async (projectDir: string, options: VapidData) => {
      if (!options.vapidPubkey || !options.vapidPvtkey || !options.vapidSubject) {
        throw new Error(
          'Must specify all three fields (--vapid-pubkey, --vapid-pvtkey, and --vapid-subject) to upload.'
        );
      }

      await _uploadWebPushCredientials(projectDir, options);
    });

  program
    .command('push:web:generate [project-dir]')
    .description('Generates VAPID key pair for web push notifications.')
    .option('--vapid-subject [vapid-subject]', vapidSubjectDescription)
    .asyncActionProjectDir(async (projectDir: string, options: VapidData) => {
      if (!options.vapidSubject) {
        throw new Error('Must specify --vapid-subject.');
      }

      const results = await _uploadWebPushCredientials(projectDir, options);
      log(chalk.green(`Your VAPID public key is: ${results.vapidPublicKey}`));
      log(chalk.green(`Your VAPID private key is: ${results.vapidPrivateKey}`));
    });

  program
    .command('push:web:show [project-dir]')
    .description(
      'Prints the VAPID public key, the VAPID private key, and the VAPID subject currently in use for web notifications for this project.'
    )
    .asyncActionProjectDir(async (projectDir: string) => {
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
    });

  program
    .command('push:web:clear [project-dir]')
    .description(
      'Deletes previously uploaded VAPID public key, VAPID private key, and VAPID subject.'
    )
    .asyncActionProjectDir(async (projectDir: string) => {
      log('Reading project configuration...');
      const {
        args: { remotePackageName },
      } = await Exp.getPublishInfoAsync(projectDir);

      log('Logging in...');
      const user = await UserManager.getCurrentUserAsync();
      const apiClient = ApiV2.clientForUser(user);

      log("Deleting API key from Expo's servers...");

      await apiClient.deleteAsync(`credentials/push/web/${remotePackageName}`);
    });
}

async function _uploadWebPushCredientials(projectDir: string, options: VapidData) {
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

  if (results.oldVapidData && results.oldVapidData.vapidPublicKey !== results.vapidPublicKey) {
    log(
      chalk.yellow(
        `Warning: You have previously stored another VAPID key pair on Expo's servers. Your current action has overridden the old key pair. This means that all your web clients will not receive any new notifications from you until you have deployed the app containing the new VAPID public key, and that the user has visited the site again since then.`
      )
    );
    log(chalk.yellow(`For your records:`));
    log(chalk.yellow(`- Your old VAPID public key: ${results.oldVapidData.vapidPublicKey}`));
    log(chalk.yellow(`- Your old VAPID private key: ${results.oldVapidData.vapidPrivateKey}`));
    log(chalk.yellow(`- Your old VAPID subject: ${results.oldVapidData.vapidSubject}`));
    log(
      chalk.yellow(
        `If you wish to undo the current action, you can use the following command to upload your old credentials back to Expo's servers:`
      )
    );
    log(
      chalk.yellowBright(
        `expo push:web:upload --vapid-pubkey ${results.oldVapidData.vapidPublicKey} --vapid-pvtkey ${results.oldVapidData.vapidPrivateKey} --vapid-subject ${results.oldVapidData.vapidSubject}`
      )
    );
  }
  log(chalk.green(`VAPID data uploaded!`));

  /**
   * Customize app.json
   */
  log(`Reading app.json...`);
  const { configPath } = ConfigUtils.findConfigFile(projectDir);
  const appJson = JSON.parse(await fse.readFile(configPath).then(value => value.toString()));
  let changedProperties = [];

  if (user) {
    if (appJson.expo.owner && appJson.expo.owner !== user.username) {
      log(
        chalk.yellow(
          `Warning: expo.owner is already configured to be "${appJson.expo.owner}" in app.json, but your current username is "${user.username}". You will not receive any push notification if you do not change expo.owner to "${user.username}" in app.json. Alternatively, you could choose to login to "${appJson.expo.owner}" and then execute this command again.`
        )
      );
    } else {
      appJson.expo.owner = user.username;
      changedProperties.push('expo.owner');
    }
  }

  if (
    appJson.expo.notification &&
    appJson.expo.notification.vapidPublicKey &&
    appJson.expo.notification.vapidPublicKey !== results.vapidPublicKey
  ) {
    log(
      chalk.cyan(
        `Notice: expo.notification.vapidPublicKey is already configured in app.json (${
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
    log(`Writing to app.json...`);
    await fse.writeFile(configPath, JSON.stringify(appJson, null, 2));
    log(chalk.green(`Wrote ${changedProperties.join(', ')} to app.json.`));
  }

  log(chalk.green('All done!'));

  return results;
}
