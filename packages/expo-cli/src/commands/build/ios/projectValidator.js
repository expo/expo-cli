import { XDLError, ErrorCode } from 'xdl';

import { PLATFORMS } from '../constants';
import * as utils from '../utils';

async function validateProject({ sdkVersion, bundleIdentifier }) {
  // 1. expo.ios.bundleIdentifier key must be defined in app.json.
  ensureBundleIdentifierIsDefined(bundleIdentifier);

  // 2. SDK version must be still supported.
  await utils.checkIfSdkIsSupported(sdkVersion, PLATFORMS.IOS);
}

function ensureBundleIdentifierIsDefined(bundleIdentifier) {
  if (!bundleIdentifier) {
    throw new XDLError(
      ErrorCode.INVALID_OPTIONS,
      `Your project must have a bundleIdentifier set in app.json.
See https://docs.expo.io/versions/latest/guides/building-standalone-apps.html`
    );
  }
}

export default validateProject;
