import { Platform, getConfig } from '@expo/config';

import Api from '../Api';
import UserManager from '../User';
import { ApiV2 } from '../xdl';
import { Keystore } from './AndroidCredentials';
import * as Ios from './IosCredentials';

export type Credentials = Ios.Credentials; // can't import android types from typescript

export type CredentialMetadata = {
  username: string;
  experienceName: string;
  bundleIdentifier?: string;
  platform: string;
  only?: any;
};

export { Ios };

/** @deprecated */
export async function getCredentialMetadataAsync(
  projectRoot: string,
  platform: Platform
): Promise<CredentialMetadata> {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const user = await UserManager.ensureLoggedInAsync();
  let { username } = user;
  if (exp.owner) {
    username = exp.owner;
  }

  const bundleIdentifier = platform === 'ios' ? exp.ios?.bundleIdentifier : undefined;

  return {
    username,
    experienceName: `@${username}/${exp.slug}`,
    bundleIdentifier,
    platform,
  };
}

/** @deprecated */
export async function credentialsExistForPlatformAsync(
  metadata: CredentialMetadata
): Promise<boolean> {
  const credentials = await fetchCredentials(metadata, false);
  return !!credentials;
}

/** @deprecated */
export async function getEncryptedCredentialsForPlatformAsync(
  metadata: CredentialMetadata
): Promise<Credentials | undefined | null> {
  return fetchCredentials(metadata, false);
}

/** @deprecated */
export async function getCredentialsForPlatform(
  metadata: CredentialMetadata
): Promise<Credentials | undefined | null> {
  return fetchCredentials(metadata, true);
}

/** @deprecated use expo-cli/src/credentials/api */
async function fetchCredentials(
  { username, experienceName, bundleIdentifier, platform }: CredentialMetadata,
  decrypt: boolean
): Promise<Credentials | undefined | null> {
  // this doesn't hit our mac rpc channel, so it needs significantly less debugging
  let credentials;
  if (process.env.EXPO_NEXT_API === 'true') {
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);

    if (platform === 'android') {
      credentials = await api.getAsync(`credentials/android/keystore/${experienceName}`);
      if (credentials['keystore']) {
        credentials['keystore']['keystoreAlias'] = credentials['keystore']['keyAlias'];
        delete credentials['keystore']['keyAlias'];
      } else {
        credentials = null;
      }
    } else if (platform === 'ios') {
      const record = await api.getAsync(
        `credentials/ios/${experienceName}/${encodeURI(bundleIdentifier ?? '')}`
      );
      if (record) {
        credentials = {
          ...record.pushCredentials,
          ...record.distCredentials,
          ...record.credentials,
        };
      } else {
        credentials = {};
      }
    }
  } else {
    const response = await Api.callMethodAsync('getCredentials', [], 'post', {
      username,
      experienceName,
      bundleIdentifier,
      platform,
      decrypt,
    });

    if (response.err) {
      throw new Error('Error fetching credentials.');
    }
    credentials = response.credentials;
  }
  return credentials;
}

/** @deprecated use expo-cli/src/credentials/api */
export async function updateCredentialsForPlatform(
  platform: 'android',
  newCredentials: Keystore,
  userCredentialsIds: number[],
  metadata: CredentialMetadata
): Promise<void> {
  if (process.env.EXPO_NEXT_API === 'true') {
    const { experienceName } = metadata;
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    const result = await api.putAsync(`credentials/android/keystore/${experienceName}`, {
      keystore: newCredentials,
    });

    if (result.errors) {
      throw new Error(`Error updating credentials: ${JSON.stringify(result.errors)}`);
    }
  } else {
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
}

export async function removeCredentialsForPlatform(
  platform: 'android', // this is only used for android credential management now.
  metadata: CredentialMetadata
): Promise<void> {
  // doesn't go through mac rpc, no request id needed
  if (process.env.EXPO_NEXT_API === 'true') {
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    await api.deleteAsync(`credentials/android/keystore/${metadata.experienceName}`);
  } else {
    const { err } = await Api.callMethodAsync('deleteCredentials', [], 'post', {
      platform,
      ...metadata,
    });

    if (err) {
      throw new Error('Error deleting credentials.');
    }
  }
}
