import axios from 'axios';
import ErrorCode from './ErrorCode';
import * as Versions from './Versions';
import XDLError from './XDLError';

export async function getManifest(publicUrl, opts = {}) {
  const req = {
    url: publicUrl,
    method: 'get',
    headers: { Accept: 'application/expo+json,application/json' },
  };

  let exp;
  try {
    const resp = await axios.request(req);
    exp = resp.data;
  } catch (e) {
    throw new XDLError(
      ErrorCode.INVALID_MANIFEST,
      `Unable to fetch manifest from ${publicUrl}. ` + e.toString()
    );
  }
  exp = await _extractManifest(exp, publicUrl);
  if (opts.platform && exp.platform !== opts.platform && opts.platform !== 'all') {
    throw new XDLError(
      ErrorCode.INVALID_MANIFEST,
      `Manifest from ${publicUrl} is not compatible with the ${opts.platform} platform`
    );
  }
  return exp;
}

// Third party publicUrls can return an array of manifests
// We need to choose the first compatible one
async function _extractManifest(expOrArray, publicUrl) {
  // if its not an array, assume it was a single manifest obj
  if (!Array.isArray(expOrArray)) {
    return expOrArray;
  }

  for (let i = 0; i < expOrArray.length; i++) {
    const manifestCandidate = expOrArray[i];
    const sdkVersion = manifestCandidate.sdkVersion;
    if (!sdkVersion) {
      continue;
    }
    const { sdkVersions } = await Versions.versionsAsync();
    const versionObj = sdkVersions[sdkVersion];
    if (!versionObj) {
      continue;
    }

    const isDeprecated = versionObj.isDeprecated || false;
    if (!isDeprecated) {
      return manifestCandidate;
    }
  }
  const supportedVersions = await Versions.versionsAsync();
  throw new XDLError(
    ErrorCode.INVALID_MANIFEST,
    `No compatible manifest found at ${publicUrl}. Please use one of the SDK versions supported: ${JSON.stringify(
      supportedVersions
    )}`
  );
}
