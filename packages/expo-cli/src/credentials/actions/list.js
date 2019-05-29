/* @flow */

import chalk from 'chalk';
import uniq from 'lodash/uniq';
import fs from 'fs-extra';
import get from 'lodash/get';
import { Credentials } from 'xdl';

import log from '../../log';
import type {
  IosCredentials,
  IosPushCredentials,
  IosDistCredentials,
  IosAppCredentials,
  AndroidCredentials,
} from '../schema';

export async function getIosCredentials(apiClient: any): Promise<IosCredentials> {
  return await apiClient.getAsync('credentials/ios');
}

export async function displayIosCredentials(credentials: IosCredentials) {
  log(chalk.bold('Credentials available on ios\n'));

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
    `  Experience: ${chalk.bold(appCredentials.experienceName)}, Bundle identifier: ${
      appCredentials.bundleIdentifier
    }`
  );
  if (appCredentials.provisioningProfile && appCredentials.provisioningProfileId) {
    log(`    Provisioning profile (ID: ${chalk.green(appCredentials.provisioningProfileId)})`);
  } else {
    log('    Provisioning profile is missing. It will be generated durring next build');
  }
  if (appCredentials.teamId || appCredentials.teamName) {
    log(
      `    Apple Team ID: ${chalk.green(
        appCredentials.teamId || '---------'
      )},  Apple Team Name: ${chalk.green(appCredentials.teamName || '---------')}`
    );
  }
  if (appCredentials.pushP12 && appCredentials.pushPassword) {
    log(
      `    (deprecated) Push Certificate (Push ID: ${chalk.green(
        appCredentials.pushId || '-----'
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
    log(`  Distribution Certificate - Certificate ID: ${chalk.green(userCredentials.certId)}`);
  } else {
    log.warn(`  Unknown key type ${userCredentials.type}`);
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
        .filter(c => c[field] === userCredentials.userCredentialsId)
        .map(c => c.experienceName)
    ).join(', ');
    const usedByAppsText = usedByApps ? `used by ${usedByApps}` : 'not used by any apps';
    log(`    ${chalk.gray(usedByAppsText)}`);
  }
}

export async function getAndroidCredentials(
  apiClient: any
): Promise<{ appCredentials: Array<AndroidCredentials> }> {
  return await apiClient.getAsync('credentials/android');
}

export async function displayAndroidCredentials(appCredentials: Array<AndroidCredentials>) {
  log(chalk.bold('Available android credentials'));
  log();
  for (const cred of appCredentials) {
    await displayAndroidAppCredentials(cred);
  }
}

export async function displayAndroidAppCredentials(cred: AndroidCredentials) {
  const tmpFilename = `expo_tmp_keystore_file.jks`;
  try {
    if (await fs.exists(tmpFilename)) {
      await fs.unlink(tmpFilename);
    }
    log(chalk.green(cred.experienceName));
    log(chalk.bold('  Keystore hashes'));
    if (get(cred, 'credentials.keystore')) {
      const storeBuf = Buffer.from(get(cred, 'credentials.keystore'), 'base64');
      await fs.writeFile(tmpFilename, storeBuf);

      await Credentials.Android.logKeystoreHashes(
        {
          keystorePath: tmpFilename,
          keystorePassword: get(cred, 'credentials.keystorePassword'),
          keyAlias: get(cred, 'credentials.keyAlias'),
        },
        (...args) => log('   ', ...args)
      );
    } else {
      log('    -----------------------');
    }
    log(chalk.bold('  Push Notifications credentials'));
    log(`    FCM api key: ${get(cred, 'credentials.fcmApiKey', '-------')}`);
    log('\n');
  } catch (error) {
    log.error('  Failed to parse keystore', error);
    log('\n');
  } finally {
    if (await fs.exists(tmpFilename)) {
      await fs.unlink(tmpFilename);
    }
  }
}
