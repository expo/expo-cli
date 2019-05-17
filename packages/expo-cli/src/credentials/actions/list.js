/* @flow */

import chalk from 'chalk';
import uniq from 'lodash/uniq';

import log from '../../log';
import type {
  IosCredentials,
  IosPushCredentials,
  IosDistCredentials,
  IosAppCredentials,
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
