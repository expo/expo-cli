import isEmpty from 'lodash/isEmpty';

import { Platform, readConfigJsonAsync } from '@expo/config';
import { ApiV2 } from '../xdl';

import Api from '../Api';
import UserManager from '../User';
import * as Ios from './IosCredentials';

export type Credentials = Ios.Credentials; // can't import android types from typescript

export type CredentialMetadata = {
  username: string;
  experienceName: string;
  bundleIdentifier?: string;
  platform: string;
};

export { Ios };

export async function getCredentialMetadataAsync(
  projectRoot: string,
  platform: Platform
): Promise<CredentialMetadata> {
  const { exp } = await readConfigJsonAsync(projectRoot);

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

export async function credentialsExistForPlatformAsync(
  metadata: CredentialMetadata
): Promise<boolean> {
  const credentials = await fetchCredentials(metadata, false);
  return !!credentials;
}

export async function getEncryptedCredentialsForPlatformAsync(
  metadata: CredentialMetadata
): Promise<Credentials | undefined | null> {
  return fetchCredentials(metadata, false);
}

export async function getCredentialsForPlatform(
  metadata: CredentialMetadata
): Promise<Credentials | undefined | null> {
  return fetchCredentials(metadata, true);
}

async function fetchCredentials(
  { username, experienceName, bundleIdentifier, platform }: CredentialMetadata,
  decrypt: boolean
): Promise<Credentials | undefined | null> {
  // this doesn't hit our mac rpc channel, so it needs significantly less debugging
  let credentials;
  if (process.env.EXPO_NEXT_API) {
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);

    if (platform === 'android') {
      credentials = await api.getAsync(`credentials/${platform}/keystore/${experienceName}`);
      if (credentials['keystore']) {
        credentials['keystore']['keystoreAlias'] = credentials['keystore']['keyAlias'];
        delete credentials['keystore']['keyAlias'];
      } else {
        return null;
      }
    } else if (platform === 'ios') {
      const record = await api.getAsync(
        `credentials/${platform}/${experienceName}/${encodeURI(bundleIdentifier)}`
      );
      if (record) {
        const { pushCredentials, distCredentials, credentials } = record;
        return {
          credentials: {
            ...pushCredentials,
            ...distCredentials,
            ...credentials,
          },
        };
      } else {
        return {};
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

export async function updateCredentialsForPlatform(
  platform: string,
  newCredentials: Credentials,
  userCredentialsIds: Array<number>,
  metadata: CredentialMetadata
): Promise<void> {
  console.log('updateCredentialsForPlatform', {
    platform,
    newCredentials,
    userCredentialsIds,
    metadata,
  });

  if (process.env.EXPO_NEXT_API) {
    //TODO-JJ make this work for ios as well
    console.log('API V2 updateCredentialsForPlatform');
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    const result = await api.putAsync(
      `credentials/${platform}/keystore/${metadata.experienceName}`,
      {
        credentials: newCredentials,
      }
    );

    console.log('API V2 creds result:', result);
    if (!result) {
      throw new Error('Error updating credentials.');
    }
  } else {
    const { err, credentials } = await Api.callMethodAsync('updateCredentials', [], 'post', {
      credentials: newCredentials,
      userCredentialsIds,
      platform,
      ...metadata,
    });

    console.log({ err, credentials });
    if (err || !credentials) {
      throw new Error('Error updating credentials.');
    }
  }
}

export async function removeCredentialsForPlatform(
  platform: string,
  metadata: CredentialMetadata
): Promise<void> {
  // doesn't go through mac rpc, no request id needed
  console.log('deleteCredentials');
  console.log({ platform, metadata });

  if (process.env.EXPO_NEXT_API) {
    console.log('API V2 Delete CredentialsForPlatform');
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    if (platform === 'android') {
      const result = await api.deleteAsync(
        `credentials/android/keystore/${metadata.experienceName}`
      );

      console.log('API V2 creds result:', result);
      if (!result) {
        throw new Error('Error deleting credentials.');
      }
    } else if (platform === 'ios') {
      const { only } = metadata;

      if (only.appCredentials) {
        only.provisioningProfile = true;
        only.pushCert = true;
        delete only.appCredentials;
      }
      const currentCredentials = await api.getAsync(
        `credentials/ios/${metadata.experienceName}/${encodeURI(metadata.bundleIdentifier)}`
      );
      if (isEmpty(currentCredentials)) {
        return;
      }

      if (only.provisioningProfile) {
        await api.postAsync('/credentials/ios/provisioningProfile/delete', {
          experienceName: metadata.experienceName,
          bundleIdentifier: metadata.bundleIdentifier,
        });
      }
      if (only.pushCert) {
        await api.postAsync('/credentials/ios/pushCert/delete', {
          experienceName: metadata.experienceName,
          bundleIdentifier: metadata.bundleIdentifier,
        });
      }
      if (only.pushKey && currentCredentials.pushCredentialsId) {
        await api.delAsync(`/credentials/ios/push/${currentCredentials.pushCredentialsId}`);
      }
      if (only.distributionCert && currentCredentials.distCredentialsId) {
        await api.delAsync(`/credentials/ios/dist/${currentCredentials.distCredentialsId}`);
      }
    }
  } else {
    const { err } = await Api.callMethodAsync('deleteCredentials', [], 'post', {
      platform,
      ...metadata,
    });

    console.log({ err });
    if (err) {
      throw new Error('Error deleting credentials.');
    }
  }
}
