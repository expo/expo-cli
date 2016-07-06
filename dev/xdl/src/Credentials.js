/**
 * @flow
 * @providesModule XDLCredentials
 */

import Api from './Api';

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
};

export type Credentials = IOSCredentials & AndroidCredentials;

type CredentialMetadata = {
  username: string,
  experienceName: string,
  platform: string
}

export async function credentialsExistForPlatformAsync({
  username,
  experienceName,
  platform,
}: CredentialMetadata): Promise<?Credentials> {
  const { err, credentials } = await Api.callMethodAsync('getCredentials', [], 'post', {
    username,
    experienceName,
    platform,
    decrypt: false,
  });

  if (err) {
    throw new Error('Error fetching credentials.');
  }

  return credentials;
}

export async function updateCredentialsForPlatform(platform: string, newCredentials: Credentials, metadata: CredentialMetadata): Promise<void> {
  const { err, credentials } = await Api.callMethodAsync('updateCredentials', [], 'post', {
    credentials: newCredentials,
    platform,
    ...metadata,
  });

  if (err || !credentials) {
    throw new Error('Error updating credentials.');
  }

  return;
}

export async function removeCredentialsForPlatform(platform: string, metadata: CredentialMetadata): Promise<void> {
  const { err } = await Api.callMethodAsync('deleteCredentials', [], 'post', {
    platform,
    ...metadata,
  });

  if (err) {
    throw new Error('Error deleting credentials.');
  }

  return;
}

export async function validateCredentialsForPlatform(
  platform: string,
  validationType: string,
  credentials: ?Credentials,
  metadata: CredentialMetadata
): Promise<void> {
  const { err, isValid } = await Api.callMethodAsync('validateCredentials', [], 'post', {
    credentials,
    platform,
    validationType,
    ...metadata,
  });

  if (err || !isValid) {
    throw new Error('Credentials are invalid.');
  }

  return isValid;
}

export async function fetchAppleCertificates(
  metadata: CredentialMetadata,
): Promise<void> {
  const { err, success } = await Api.callMethodAsync('fetchAppleCertificates', [], 'post', {
    ...metadata,
  });

  if (err || !success) {
    throw new Error('Unable to fetch new certificates.');
  }

  return success;
}
