import { Credentials, IosCodeSigning } from 'xdl';

import prompt from './prompt';
import revoke from './revoke';
import { generate, determineMissingCredentials } from './generate';
import { PLATFORMS } from '../../constants';
import log from '../../../../log';

async function fetch(projectMetadata, decrypt = false) {
  const query = {
    ...projectMetadata,
    platform: PLATFORMS.IOS,
  };
  return decrypt
    ? await Credentials.getCredentialsForPlatform(query)
    : await Credentials.getEncryptedCredentialsForPlatformAsync(query);
}

async function getDistributionCertSerialNumber(projectMetadata) {
  const { certP12, certPassword } = await fetch(projectMetadata, true);
  if (certP12 && certPassword) {
    return IosCodeSigning.findP12CertSerialNumber(certP12, certPassword);
  } else {
    return null;
  }
}

async function update(projectMetadata, credentials, userCredentialsIds) {
  await Credentials.updateCredentialsForPlatform(
    PLATFORMS.IOS,
    credentials,
    userCredentialsIds,
    projectMetadata
  );
  log.warn('Encrypted credentials and saved to the Expo servers');
}

async function clear({ username, experienceName, bundleIdentifier }, only) {
  await Credentials.removeCredentialsForPlatform(PLATFORMS.IOS, {
    username,
    experienceName,
    bundleIdentifier,
    only,
  });
  log.warn('Removed existing credentials from expo servers');
}

export {
  fetch,
  getDistributionCertSerialNumber,
  update,
  generate,
  clear,
  revoke,
  determineMissingCredentials,
  prompt,
};
