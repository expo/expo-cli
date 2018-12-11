import { Credentials } from 'xdl';

import { PLATFORMS } from '../constants';

async function clearCredentials({ username, experienceName, bundleIdentifier }, only) {
  await Credentials.removeCredentialsForPlatform(PLATFORMS.IOS, {
    username,
    experienceName,
    bundleIdentifier,
    only,
  });
  log.warn('Removed existing credentials from expo servers');
}

export { clearCredentials };
