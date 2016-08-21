/**
 * @flow
 * @providesModule XDLCredentials
 */

import Api from './Api';
import ErrorCode from './ErrorCode';
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
};

export type Credentials = IOSCredentials & AndroidCredentials;

export type CredentialMetadata = {
  username: string,
  experienceName: string,
  bundleIdentifier: string,
  platform: string
}

export async function credentialsExistForPlatformAsync({
  username,
  experienceName,
  bundleIdentifier,
  platform,
}: CredentialMetadata): Promise<?Credentials> {
  const { err, credentials } = await Api.callMethodAsync('getCredentials', [], 'post', {
    username,
    experienceName,
    bundleIdentifier,
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
  const { isValid, error, errorCode } = await Api.callMethodAsync('validateCredentials', [], 'post', {
    credentials,
    platform,
    validationType,
    ...metadata,
  });

  if (!isValid || error) {
    switch (errorCode) {
      case "ERROR_CREDENTIALS_VALIDATION_TWOFACTOR":
        throw new XDLError(ErrorCode.CREDENTIAL_ERROR, 'Two factor authentication is not yet supported. Stay tuned!');
      case "ERROR_CREDENTIALS_VALIDATION_USERPASS":
        throw new XDLError(ErrorCode.CREDENTIAL_ERROR, 'Username/Password is incorrect.');
      default:
        throw new Error('Server error when validating credentials.');
    }
  }

  return;
}

export async function fetchAppleCertificates(
  metadata: CredentialMetadata,
): Promise<void> {
  const { err, success, error, errorCode } = await Api.callMethodAsync('fetchAppleCertificates', [], 'post', {
    ...metadata,
  });

  if (err || !success || error) {
    switch (errorCode) {
      case 'ERROR_CERT_VALIDATION_MAXIMUM_CERTS_REACHED':
        throw new XDLError(ErrorCode.CREDENTIAL_ERROR, 'Maximum number of certificates have been reached in your developer portal. Please delete them or choose one of them to upload to Exponent.');
      default:
        throw new Error('Unable to fetch new certificates.');
    }
  }

  return success;
}

export async function ensureAppId(
  metadata: CredentialMetadata,
): Promise<void> {
  const { err, success } = await Api.callMethodAsync('ensureAppId', [], 'post', {
    ...metadata,
  });

  if (err || !success) {
    throw new Error('Unable to create app id.');
  }

  return success;
}

export async function fetchPushCertificates(
  metadata: CredentialMetadata,
): Promise<void> {
  const { err, success } = await Api.callMethodAsync('fetchPushCertificates', [], 'post', {
    ...metadata,
  });

  if (err || !success) {
    throw new Error('Unable to fetch push certificates.');
  }

  return success;
}
