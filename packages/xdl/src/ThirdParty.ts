import axios, { AxiosRequestConfig } from 'axios';

import * as Versions from './Versions';
import XDLError from './XDLError';

export async function getManifest(
  publicUrl: string,
  { platform = 'all' }: { platform?: 'android' | 'ios' | 'all' } = {}
) {
  const req: AxiosRequestConfig = {
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
      'INVALID_MANIFEST',
      `Unable to fetch manifest from ${publicUrl}. ` + e.toString()
    );
  }
  exp = await _extractManifest(exp, publicUrl);
  if (exp.platform !== platform && platform !== 'all') {
    throw new XDLError(
      'INVALID_MANIFEST',
      `Manifest from ${publicUrl} is not compatible with the ${platform} platform`
    );
  }
  return exp;
}

// Third party publicUrls can return an array of manifests
// We need to choose the first compatible one
async function _extractManifest(expOrArray: any, publicUrl: string) {
  // if its not an array, assume it was a single manifest obj
  if (!Array.isArray(expOrArray)) {
    return expOrArray;
  }

  const { sdkVersions } = await Versions.versionsAsync();
  for (let i = 0; i < expOrArray.length; i++) {
    const manifestCandidate = expOrArray[i];
    const sdkVersion = manifestCandidate.sdkVersion;
    if (!sdkVersion) {
      continue;
    }
    const versionObj = sdkVersions[sdkVersion];
    if (!versionObj) {
      continue;
    }

    const isDeprecated = versionObj.isDeprecated || false;
    if (!isDeprecated) {
      return manifestCandidate;
    }
  }
  const supportedVersions = Object.keys(sdkVersions);
  throw new XDLError(
    'INVALID_MANIFEST',
    `No compatible manifest found at ${publicUrl}. Please use one of the SDK versions supported: ${JSON.stringify(
      supportedVersions
    )}`
  );
}
