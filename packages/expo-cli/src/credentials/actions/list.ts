import chalk from 'chalk';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { AndroidCredentials as Android } from 'xdl';

import Log from '../../log';
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
    Log.log(
      chalk.bold(
        `No credentials configured for app ${experienceName} with bundle identifier ${bundleIdentifier}\n`
      )
    );
    return;
  }

  Log.log();
  Log.log(chalk.bold('Project Credential Configuration:'));
  displayIosAppCredentials(appCredentials);
  Log.log();

  if (distCert) {
    displayIosUserCredentials(distCert);
  }

  if (pushKey) {
    displayIosUserCredentials(pushKey);
  }
}

export async function displayIosCredentials(credentials: IosCredentials) {
  Log.log(chalk.bold('Available credentials for iOS apps\n'));

  Log.log(chalk.bold('Application credentials\n'));
  for (const cred of credentials.appCredentials) {
    displayIosAppCredentials(cred);
    Log.log();
  }

  Log.log();
  Log.log(chalk.bold('User credentials\n'));
  for (const cred of credentials.userCredentials) {
    displayIosUserCredentials(cred, credentials);
    Log.log();
  }
  Log.log();
  Log.log();
}

export function displayIosAppCredentials(appCredentials: IosAppCredentials) {
  Log.log(
    `  Experience: ${chalk.bold(appCredentials.experienceName)}, bundle identifier: ${
      appCredentials.bundleIdentifier
    }`
  );
  if (appCredentials.credentials.provisioningProfile) {
    Log.log(
      `    Provisioning profile (ID: ${chalk.green(
        appCredentials.credentials.provisioningProfileId || '---------'
      )})`
    );
  } else {
    Log.log('    Provisioning profile is missing. It will be generated during the next build');
  }
  if (appCredentials.credentials.teamId || appCredentials.credentials.teamName) {
    Log.log(
      `    Apple Team ID: ${chalk.green(
        appCredentials.credentials.teamId || '---------'
      )},  Apple Team Name: ${chalk.green(appCredentials.credentials.teamName || '---------')}`
    );
  }
  if (appCredentials.credentials.pushP12 && appCredentials.credentials.pushPassword) {
    Log.log(
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
    Log.log(`  Push Notifications Key - Key ID: ${chalk.green(userCredentials.apnsKeyId)}`);
  } else if (userCredentials.type === 'dist-cert') {
    Log.log(
      `  Distribution Certificate - Certificate ID: ${chalk.green(
        userCredentials.certId || '-----'
      )}`
    );
  } else {
    Log.warn(`  Unknown key type ${(userCredentials as any).type}`);
  }
  Log.log(
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
    Log.log(`    ${chalk.gray(usedByAppsText)}`);
  }
}

export async function displayAndroidCredentials(credentialsList: AndroidCredentials[]) {
  Log.log(chalk.bold('Available Android credentials'));
  Log.log();
  for (const credentials of credentialsList) {
    await displayAndroidAppCredentials(credentials);
  }
}

export async function displayAndroidAppCredentials(credentials: AndroidCredentials) {
  const tmpFilename = path.join(os.tmpdir(), `expo_tmp_keystore_${uuid()}file.jks`);
  try {
    Log.log(chalk.green(credentials.experienceName));
    Log.log(chalk.bold('  Upload Keystore hashes'));
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
      Log.log('    -----------------------');
    }
    Log.log(chalk.bold('  Push Notifications credentials'));
    Log.log('    FCM Api Key: ', credentials.pushCredentials?.fcmApiKey ?? '---------------------');
    Log.log('\n');
  } catch (error) {
    Log.error('  Failed to parse the Keystore', error);
    Log.log('\n');
  } finally {
    await fs.remove(tmpFilename);
  }
}
