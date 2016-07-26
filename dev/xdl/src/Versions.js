/**
 * @flow
 */

import _ from 'lodash';
import semver from 'semver';

import Api from './Api';

export function gteSdkVersion(expJson: any, sdkVersion: string): boolean {
  if (!expJson.sdkVersion) {
    return false;
  }

  if (expJson.sdkVersion === 'UNVERSIONED') {
    return true;
  }

  return semver.gte(expJson.sdkVersion, sdkVersion);
}

export function parseSdkVersionFromTag(tag: string) {
  if (tag.startsWith('sdk-')) {
    return tag.substring(4);
  }

  return tag;
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
