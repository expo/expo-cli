/**
 * @flow
 */

import _ from 'lodash';
import semver from 'semver';

import Api from './Api';
import ErrorCode from './ErrorCode';
import XDLError from './XDLError';

export function gteSdkVersion(expJson: any, sdkVersion: string): boolean {
  if (!expJson.sdkVersion) {
    return false;
  }

  if (expJson.sdkVersion === 'UNVERSIONED') {
    return true;
  }

  try {
    return semver.gte(expJson.sdkVersion, sdkVersion);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_VERSION, `${expJson.sdkVersion} is not a valid version. Must be in the form of x.y.z`);
  }
}

export function parseSdkVersionFromTag(tag: string) {
  if (tag.startsWith('sdk-')) {
    return tag.substring(4);
  }

  return tag;
}

export async function newestSdkVersionAsync() {
  let sdkVersions = await Api.sdkVersionsAsync();
  let result;
  let highestMajorVersion = '0.0.0';
  _.forEach(sdkVersions, (value, key) => {
    if (semver.major(key) > semver.major(highestMajorVersion)) {
      highestMajorVersion = key;
      result = value;
    }
  });
  result.version = highestMajorVersion;
  return result;
}

export async function facebookReactNativeVersionsAsync(): Promise<Array<string>> {
  let sdkVersions = await Api.sdkVersionsAsync();
  let facebookReactNativeVersions = new Set();

  _.forEach(sdkVersions, (value) => {
    if (value.facebookReactNativeVersion) {
      facebookReactNativeVersions.add(value.facebookReactNativeVersion);
    }
  });

  return Array.from(facebookReactNativeVersions);
}

export async function facebookReactNativeVersionToExponentVersionAsync(facebookReactNativeVersion: string): Promise<? string> {
  if (!semver.valid(facebookReactNativeVersion)) {
    throw new XDLError(ErrorCode.INVALID_VERSION, `${facebookReactNativeVersion} is not a valid version. Must be in the form of x.y.z`);
  }

  let sdkVersions = await Api.sdkVersionsAsync();
  let currentSdkVersion = null;

  _.forEach(sdkVersions, (value, key) => {
    if (semver.major(value.facebookReactNativeVersion) === semver.major(facebookReactNativeVersion) &&
        semver.minor(value.facebookReactNativeVersion) === semver.minor(facebookReactNativeVersion) &&
        (!currentSdkVersion || semver.gt(key, currentSdkVersion))) {
      currentSdkVersion = key;
    }
  });

  return currentSdkVersion;
}
