import { Credentials, IosCodeSigning } from '@expo/xdl';

import prompt from './prompt';
import revoke from './revoke';
import { determineMissingCredentials, generate } from './generate';
import { PLATFORMS } from '../../constants';
import log from '../../../../log';

export async function fetch(
  projectMetadata: Pick<Credentials.CredentialMetadata, 'username' | 'experienceName'>,
  decrypt: boolean = false
) {
  const query: Credentials.CredentialMetadata = {
    ...projectMetadata,
    platform: PLATFORMS.IOS,
  };
  return decrypt
    ? await Credentials.getCredentialsForPlatform(query)
    : await Credentials.getEncryptedCredentialsForPlatformAsync(query);
}

export async function getDistributionCertSerialNumber(
  projectMetadata: Pick<Credentials.CredentialMetadata, 'username' | 'experienceName'>
) {
  const { certP12, certPassword } = (await fetch(
    projectMetadata,
    true
  )) as Credentials.Ios.Credentials;
  if (certP12 && certPassword) {
    return IosCodeSigning.findP12CertSerialNumber(certP12, certPassword);
  } else {
    return null;
  }
}

export async function update(
  projectMetadata: Credentials.CredentialMetadata,
  credentials: Credentials.Credentials,
  userCredentialsIds: number[]
): Promise<void> {
  await Credentials.updateCredentialsForPlatform(
    PLATFORMS.IOS,
    credentials,
    userCredentialsIds,
    projectMetadata
  );
  log.warn('Encrypted credentials and saved to the Expo servers');
}

export async function clear(
  {
    username,
    experienceName,
    bundleIdentifier,
  }: Pick<Credentials.CredentialMetadata, 'username' | 'experienceName' | 'bundleIdentifier'>,
  only: any
) {
  // @ts-ignore: 'platform' is declared here.
  await Credentials.removeCredentialsForPlatform(PLATFORMS.IOS, {
    username,
    experienceName,
    bundleIdentifier,
    only,
  });
  log.warn('Removed existing credentials from expo servers');
}

export { generate, revoke, determineMissingCredentials, prompt };
