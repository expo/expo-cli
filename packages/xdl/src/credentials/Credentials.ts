import { Platform } from '@expo/config';

import Api from '../Api';
import UserManager from '../User';
import * as Ios from './IosCredentials';
import { getProjectConfigAsync } from '../Config';

export type Credentials = Ios.Credentials; // can't import android types from typescript

export type CredentialMetadata = {
  username: string;
  experienceName: string;
  bundleIdentifier?: string;
  platform: string;
  only?: any;
};

export { Ios };

export async function getCredentialMetadataAsync(
  projectRoot: string,
  platform: Platform
): Promise<CredentialMetadata> {
  const { exp } = await getProjectConfigAsync(projectRoot, { skipSDKVersionRequirement: true });

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
): Promise<Credentials | undefined> {
  return fetchCredentials(metadata, false);
}

export async function getCredentialsForPlatform(
  metadata: CredentialMetadata
): Promise<Credentials | undefined> {
  return fetchCredentials(metadata, true);
}

async function fetchCredentials(
  { username, experienceName, bundleIdentifier, platform }: CredentialMetadata,
  decrypt: boolean
): Promise<Credentials | undefined> {
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
