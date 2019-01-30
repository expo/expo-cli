/**
 * @flow
 */

import chalk from 'chalk';
import fs from 'fs-extra';

import Api from './Api';
import logger from './Logger';
import * as IosCodeSigning from './detach/IosCodeSigning';

export type AndroidCredentials = {
  keystore: string,
  keystoreAlias: string,
  keystorePassword: string,
  keyPassword: string,
};

export type IOSCredentials = {
  appleId?: string,
  password?: string,
  teamId?: string,
  certP12?: string,
  certPassword?: string,
  pushP12?: string,
  pushPassword?: string,
  provisioningProfile?: string,
  enterpriseAccount?: string,
  // These are ids on the spaceship object (implementation detail), Spaceship::Portal::Certificate
  certId?: string,
  pushId?: string,
  provisioningProfileId?: string,
};

export type Credentials = IOSCredentials | AndroidCredentials;

export type CredentialMetadata = {
  username: string,
  experienceName: string,
  bundleIdentifier: string,
  platform: string,
};

export type CredObject = {
  name: string,
  value: {
    userCredentialsId?: string,
    serialNumber?: string,
  },
};

export type CredsList = Array<CredObject>;

export async function credentialsExistForPlatformAsync(
  metadata: CredentialMetadata
): Promise<?Credentials> {
  const creds = await fetchCredentials(metadata, false);
  return !!creds; // !! performed on awaited creds
}

export async function getEncryptedCredentialsForPlatformAsync(
  metadata: CredentialMetadata
): Promise<?Credentials> {
  return fetchCredentials(metadata, false);
}

export async function getCredentialsForPlatform(
  metadata: CredentialMetadata
): Promise<?Credentials> {
  return fetchCredentials(metadata, true);
}

async function fetchCredentials(
  { username, experienceName, bundleIdentifier, platform }: CredentialMetadata,
  decrypt: boolean
): Promise<?Credentials> {
  // this doesn't hit our mac rpc channel, so it needs significantly less debugging
  const { err, credentials } = await Api.callMethodAsync('getCredentials', [], 'post', {
    username,
    experienceName,
    bundleIdentifier,
    platform,
    decrypt,
  });

  if (err) {
    throw new Error('Error fetching credentials.');
  }

  return credentials;
}

export async function updateCredentialsForPlatform(
  platform: string,
  newCredentials: Credentials,
  userCredentialsIds: Array<number>,
  metadata: CredentialMetadata
): Promise<void> {
  const { err, credentials } = await Api.callMethodAsync('updateCredentials', [], 'post', {
    credentials: newCredentials,
    userCredentialsIds,
    platform,
    ...metadata,
  });

  if (err || !credentials) {
    throw new Error('Error updating credentials.');
  }
}

export async function removeCredentialsForPlatform(
  platform: string,
  metadata: CredentialMetadata
): Promise<void> {
  // doesn't go through mac rpc, no request id needed
  const { err } = await Api.callMethodAsync('deleteCredentials', [], 'post', {
    platform,
    ...metadata,
  });

  if (err) {
    throw new Error('Error deleting credentials.');
  }
}

export async function getExistingDistCerts(
  username: string,
  appleTeamId: string
): Promise<?CredsList> {
  const distCerts = await getExistingUserCredentials(username, appleTeamId, 'dist-cert');
  return distCerts.map(({ usedByApps, userCredentialsId, certId, certP12, certPassword }) => {
    const serialNumber = IosCodeSigning.findP12CertSerialNumber(certP12, certPassword);
    let name = `Serial number: ${serialNumber}`;
    if (certId) {
      name = `${name}, Certificate ID: ${certId}`;
    }
    if (usedByApps) {
      name = `Used in apps: ${usedByApps.join(', ')} (${name})`;
    }
    return {
      value: {
        distCertSerialNumber: serialNumber,
        userCredentialsId: String(userCredentialsId),
      },
      name,
    };
  });
}

export async function getExistingPushKeys(
  username: string,
  appleTeamId: string
): Promise<?CredsList> {
  const pushKeys = await getExistingUserCredentials(username, appleTeamId, 'push-key');
  return pushKeys.map(({ usedByApps, userCredentialsId, apnsKeyId }) => {
    let name = `Key ID: ${apnsKeyId}`;
    if (usedByApps) {
      name = `Used in apps: ${usedByApps.join(', ')} (${name})`;
    }
    return {
      value: {
        userCredentialsId,
      },
      name,
    };
  });
}

async function getExistingUserCredentials(
  username: string,
  appleTeamId: string,
  type: string
): Promise<?CredsList> {
  const { err, certs } = await Api.callMethodAsync('getExistingUserCredentials', [], 'post', {
    username,
    appleTeamId,
    type,
  });

  if (err) {
    throw new Error('Error getting existing distribution certificates.');
  } else {
    return certs.map(({ usedByApps, userCredentialsId, ...rest }) => ({
      usedByApps: usedByApps && usedByApps.split(';'),
      userCredentialsId: String(userCredentialsId),
      ...rest,
    }));
  }
}

export async function backupExistingAndroidCredentials({
  outputPath,
  username,
  experienceName,
  log = logger.info.bind(logger),
  logSecrets = true,
}) {
  const credentialMetadata = { username, experienceName, platform: 'android' };

  log(`Retreiving Android keystore for ${experienceName}`);

  const credentials = await getCredentialsForPlatform(credentialMetadata);
  if (!credentials) {
    throw new Error('Unable to fetch credentials for this project. Are you sure they exist?');
  }
  const { keystore, keystorePassword, keystoreAlias: keyAlias, keyPassword } = credentials;

  const storeBuf = Buffer.from(keystore, 'base64');
  log(`Writing keystore to ${outputPath}...`);
  await fs.writeFile(outputPath, storeBuf);
  if (logSecrets) {
    log('Done writing keystore to disk.');
    log(`Save these important values as well:

  Keystore password: ${chalk.bold(keystorePassword)}
  Key alias:         ${chalk.bold(keyAlias)}
  Key password:      ${chalk.bold(keyPassword)}
  `);
    log('All done!');
  }
  return {
    keystorePassword,
    keyAlias,
    keyPassword,
  };
}
