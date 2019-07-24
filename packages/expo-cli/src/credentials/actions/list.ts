import chalk from 'chalk';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';
import fs from 'fs-extra';
import get from 'lodash/get';
import { AndroidCredentials as Android } from '@expo/xdl';
import {
  AndroidCredentials,
  IosCredentials,
  IosAppCredentials,
  IosPushCredentials,
  IosDistCredentials,
} from '../credentials';

import log from '../../log';

export async function displayIosCredentials(credentials: IosCredentials) {
  log(chalk.bold('Available credentials for iOS apps\n'));

  log(chalk.bold('Application credentials\n'));
  for (const cred of credentials.appCredentials) {
    displayIosAppCredentials(cred);
    log();
  }

  log();
  log(chalk.bold('User credentials\n'));
  for (const cred of credentials.userCredentials) {
    displayIosUserCredentials(cred, credentials);
    log();
  }
  log();
  log();
}

export function displayIosAppCredentials(appCredentials: IosAppCredentials) {
  log(
    `  Experience: ${chalk.bold(appCredentials.experienceName)}, bundle identifier: ${
      appCredentials.bundleIdentifier
    }`
  );
  if (appCredentials.credentials.provisioningProfile && appCredentials.credentials.provisioningProfileId) {
    log(`    Provisioning profile (ID: ${chalk.green(appCredentials.credentials.provisioningProfileId)})`);
  } else {
    log('    Provisioning profile is missing. It will be generated durring the next build');
  }
  if (appCredentials.credentials.teamId || appCredentials.credentials.teamName) {
    log(
      `    Apple Team ID: ${chalk.green(
        appCredentials.credentials.teamId || '---------'
      )},  Apple Team Name: ${chalk.green(appCredentials.credentials.teamName || '---------')}`
    );
  }
  if (appCredentials.credentials.pushP12 && appCredentials.credentials.pushPassword) {
    log(
      `    (deprecated) Push Certificate (Push ID: ${chalk.green(
        appCredentials.credentials.pushId || '-----'
      )})`
    );
  }
}

export function displayIosUserCredentials(
  userCredentials: IosPushCredentials | IosDistCredentials,
  credentials?: IosCredentials
) {
  if (userCredentials.type === 'push-key') {
    log(`  Push Notifications Key - Key ID: ${chalk.green(userCredentials.apnsKeyId)}`);
  } else if (userCredentials.type === 'dist-cert') {
    log(`  Distribution Certificate - Certificate ID: ${chalk.green(userCredentials.certId || '-----')}`);
  } else {
    log.warn(`  Unknown key type ${get(userCredentials, 'type')}`);
  }
  log(
    `    Apple Team ID: ${chalk.green(
      userCredentials.teamId || '---------'
    )},  Apple Team Name: ${chalk.green(userCredentials.teamName || '---------')}`
  );

  if (credentials) {
    const field = userCredentials.type === 'push-key' ? 'pushCredentialsId' : 'distCredentialsId';
    const usedByApps = uniq(
      credentials.appCredentials
        .filter(c => c[field] === userCredentials.id)
        .map(c => c.experienceName)
    ).join(', ');
    const usedByAppsText = usedByApps ? `used by ${usedByApps}` : 'not used by any apps';
    log(`    ${chalk.gray(usedByAppsText)}`);
  }
}



export async function displayAndroidCredentials(credentialsList: AndroidCredentials[]) {
  log(chalk.bold('Available Android credentials'));
  log();
  for(const credentials of credentialsList) {
    await displayAndroidAppCredentials(credentials);
  }
}

export async function displayAndroidAppCredentials(credentials: AndroidCredentials) {
  const tmpFilename = `expo_tmp_keystore_file.jks`;
  try {
    if (await fs.pathExists(tmpFilename)) {
      await fs.unlink(tmpFilename);
    }

    log(chalk.green(credentials.experienceName));
    log(chalk.bold('  Upload Keystore hashes'));
    if (!isEmpty(credentials.keystore)) {
      const storeBuf = Buffer.from(get(credentials, 'keystore.keystore'), 'base64');
      await fs.writeFile(tmpFilename, storeBuf);
      await Android.logKeystoreHashes(
        {
          keystorePath: tmpFilename,
          ...(credentials.keystore as Android.Keystore)
        },
        '    ',
      );
    } else {
      log('    -----------------------');
    }
    log(chalk.bold('  Push Notifications credentials'));
    log(
      '    FCM Api Key: ',
      get(credentials, 'pushCredentials.fcmApiKey', '---------------------')
    );
    log('\n');
  } catch (error) {
    log.error('  Failed to parse the keystore', error);
    log('\n');
  } finally {
    if (await fs.pathExists(tmpFilename)) {
      await fs.unlink(tmpFilename);
    }
  }
}
