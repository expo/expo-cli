import { AndroidCredentials as Android } from '@expo/xdl';
import chalk from 'chalk';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { v4 as uuid } from 'uuid';

import log from '../../log';
import { AppLookupParams } from '../api/IosApi';
import {
  AndroidCredentials,
  IosAppCredentials,
  IosCredentials,
  IosDistCredentials,
  IosPushCredentials,
} from '../credentials';

export function displayProjectCredentials(
  appLookupParams: AppLookupParams,
  appCredentials?: IosAppCredentials | null,
  pushKey?: IosPushCredentials | null,
  distCert?: IosDistCredentials | null
): void {
  const experienceName = `@${appLookupParams.accountName}/${appLookupParams.projectName}`;
  const bundleIdentifier = appLookupParams.bundleIdentifier;
  if (!appCredentials) {
    log(
      chalk.bold(
        `No credentials configured for app ${experienceName} with bundle identifier ${bundleIdentifier}\n`
      )
    );
    return;
  }

  log();
  log(chalk.bold('Project Credential Configuration:'));
  displayIosAppCredentials(appCredentials);
  log();

  if (distCert) {
    displayIosUserCredentials(distCert);
  }

  if (pushKey) {
    displayIosUserCredentials(pushKey);
  }
}

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
  if (appCredentials.credentials.provisioningProfile) {
    log(
      `    Provisioning profile (ID: ${chalk.green(
        appCredentials.credentials.provisioningProfileId || '---------'
      )})`
    );
  } else {
    log('    Provisioning profile is missing. It will be generated during the next build');
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
    log(
      `  Distribution Certificate - Certificate ID: ${chalk.green(
        userCredentials.certId || '-----'
      )}`
    );
  } else {
    log.warn(`  Unknown key type ${(userCredentials as any).type}`);
  }
  log(
    `    Apple Team ID: ${chalk.green(
      userCredentials.teamId || '---------'
    )},  Apple Team Name: ${chalk.green(userCredentials.teamName || '---------')}`
  );

  if (credentials) {
    const field = userCredentials.type === 'push-key' ? 'pushCredentialsId' : 'distCredentialsId';
    const usedByApps = [
      ...new Set(
        credentials.appCredentials
          .filter(c => c[field] === userCredentials.id)
          .map(c => `${c.experienceName} (${c.bundleIdentifier})`)
      ),
    ].join(',\n      ');
    const usedByAppsText = usedByApps ? `used by\n      ${usedByApps}` : 'not used by any apps';
    log(`    ${chalk.gray(usedByAppsText)}`);
  }
}

export async function displayAndroidCredentials(credentialsList: AndroidCredentials[]) {
  log(chalk.bold('Available Android credentials'));
  log();
  for (const credentials of credentialsList) {
    await displayAndroidAppCredentials(credentials);
  }
}

export async function displayAndroidAppCredentials(credentials: AndroidCredentials) {
  const tmpFilename = path.join(os.tmpdir(), `expo_tmp_keystore_${uuid()}file.jks`);
  try {
    log(chalk.green(credentials.experienceName));
    log(chalk.bold('  Upload Keystore hashes'));
    if (credentials.keystore?.keystore) {
      const storeBuf = Buffer.from(credentials.keystore.keystore, 'base64');
      await fs.writeFile(tmpFilename, storeBuf);
      await Android.logKeystoreHashes(
        {
          keystorePath: tmpFilename,
          ...(credentials.keystore as Android.Keystore),
        },
        '    '
      );
    } else {
      log('    -----------------------');
    }
    log(chalk.bold('  Push Notifications credentials'));
    log('    FCM Api Key: ', credentials.pushCredentials?.fcmApiKey ?? '---------------------');
    log('\n');
  } catch (error) {
    log.error('  Failed to parse the Keystore', error);
    log('\n');
  } finally {
    await fs.remove(tmpFilename);
  }
}
