/**
 * @flow
 */

import Api from './Api';
import XDLError from './XDLError';

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
  clientExpMadeCerts?: string,
};

export type Credentials = IOSCredentials | AndroidCredentials;

export type CredentialMetadata = {
  username: string,
  experienceName: string,
  bundleIdentifier: string,
  platform: string,
};

export async function credentialsExistForPlatformAsync(
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
  metadata: CredentialMetadata
): Promise<void> {
  // this doesn't go through the mac rpc, no request id needed
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

  return;
}

export async function validateCredentialsForPlatform(
  platform: string,
  validationType: string,
  credentials: ?Credentials,
  metadata: CredentialMetadata
): Promise<void> {
  const {
    requestId,
    isValid,
    error,
    errorCode,
    errorMessage,
  } = await Api.callMethodAsync('validateCredentials', [], 'post', {
    credentials,
    platform,
    validationType,
    ...metadata,
  });

  if (!isValid || error) {
    throw new XDLError(
      errorCode,
      `Unable to validate credentials. Request ID ${requestId}, message: ${errorMessage}`
    );
  }

  return;
}

export async function fetchAppleCertificates(metadata: CredentialMetadata): Promise<void> {
  const {
    requestId,
    err,
    success,
    error,
    errorCode,
    errorMessage,
  } = await Api.callMethodAsync('fetchAppleCertificates', [], 'post', {
    ...metadata,
  });

  if (err || !success || error) {
    throw new XDLError(
      errorCode,
      `Unable to fetch distribution certificate. Request ID ${requestId}, message: ${errorMessage}`
    );
  }

  return success;
}

export async function ensureAppId(metadata: CredentialMetadata): Promise<void> {
  const {
    requestId,
    err,
    success,
    errorCode,
    errorMessage,
  } = await Api.callMethodAsync('ensureAppId', [], 'post', {
    ...metadata,
  });

  if (err || !success) {
    throw new XDLError(
      errorCode,
      `Unable to create app id. Request ID ${requestId}, message: ${errorMessage}`
    );
  }

  return success;
}

export async function fetchPushCertificates(metadata: CredentialMetadata): Promise<void> {
  const result = await Api.callMethodAsync('fetchPushCertificates', [], 'post', {
    ...metadata,
  });

  if (result.err || !result.success) {
    throw new XDLError(
      result.errorCode,
      `Unable to fetch push certificate. Request ID ${result.requestId}, message: ${result.errorMessage}`
    );
  }

  return result.success;
}
