/**
 * @flow
 */

import _ from 'lodash';
import path from 'path';
import semver from 'semver';

import ApiV2Client from './ApiV2';
import { Cacher } from './tools/FsCache';
import ErrorCode from './ErrorCode';
import XDLError from './XDLError';
import UserManager from './User';

export async function versionsAsync() {
  const api = new ApiV2Client();
  const versionCache = new Cacher(
    () => api.getAsync('versions/latest'),
    'versions.json',
    0,
    path.join(__dirname, '../caches/versions.json')
  );
  return await versionCache.getAsync();
}

export async function sdkVersionsAsync() {
  const { sdkVersions } = await versionsAsync();
  return sdkVersions;
}

export async function turtleSdkVersionsAsync() {
  const { turtleSdkVersions } = await versionsAsync();
  return turtleSdkVersions;
}

export async function setVersionsAsync(value: any) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('versions/update', {
    value,
    secret: process.env.EXPO_VERSIONS_SECRET,
  });
}

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
    throw new XDLError(
      ErrorCode.INVALID_VERSION,
      `${expJson.sdkVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }
}

export function lteSdkVersion(expJson: any, sdkVersion: string): boolean {
  if (!expJson.sdkVersion) {
    return false;
  }

  if (expJson.sdkVersion === 'UNVERSIONED') {
    return false;
  }

  try {
    return semver.lte(expJson.sdkVersion, sdkVersion);
  } catch (e) {
    throw new XDLError(
      ErrorCode.INVALID_VERSION,
      `${expJson.sdkVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }
}

export function parseSdkVersionFromTag(tag: string) {
  if (tag.startsWith('sdk-')) {
    return tag.substring(4);
  }

  return tag;
}

export async function newestSdkVersionAsync() {
  let sdkVersions = await sdkVersionsAsync();
  let result = {};
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

export async function oldestSupportedMajorVersionAsync() {
  const sdkVersions = await sdkVersionsAsync();
  const supportedVersions =  _.pickBy(sdkVersions, v => !v.isDeprecated);
  let versionNumbers = [];
  _.forEach(supportedVersions, (value, key) => {
    versionNumbers.push(semver.major(key))
  });
  return Math.min(...versionNumbers);
}

export async function facebookReactNativeVersionsAsync(): Promise<Array<string>> {
  let sdkVersions = await sdkVersionsAsync();
  let facebookReactNativeVersions = new Set();

  _.forEach(sdkVersions, value => {
    if (value.facebookReactNativeVersion) {
      facebookReactNativeVersions.add(value.facebookReactNativeVersion);
    }
  });

  return Array.from(facebookReactNativeVersions);
}

export async function facebookReactNativeVersionToExpoVersionAsync(
  facebookReactNativeVersion: string
): Promise<?string> {
  if (!semver.valid(facebookReactNativeVersion)) {
    throw new XDLError(
      ErrorCode.INVALID_VERSION,
      `${facebookReactNativeVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }

  let sdkVersions = await sdkVersionsAsync();
  let currentSdkVersion = null;

  _.forEach(sdkVersions, (value, key) => {
    if (
      semver.major(value.facebookReactNativeVersion) === semver.major(facebookReactNativeVersion) &&
      semver.minor(value.facebookReactNativeVersion) === semver.minor(facebookReactNativeVersion) &&
      (!currentSdkVersion || semver.gt(key, currentSdkVersion))
    ) {
      currentSdkVersion = key;
    }
  });

  return currentSdkVersion;
}

export async function canTurtleBuildSdkVersion(sdkVersion, platform) {
  if (sdkVersion === 'UNVERSIONED') {
    return true;
  }

  if (semver.valid(sdkVersion) == null) {
    throw new XDLError(
      ErrorCode.INVALID_VERSION,
      `"${sdkVersion}" is not a valid version. Must be in the form of x.y.z`
    );
  }

  const turtleSdkVersions = await turtleSdkVersionsAsync();
  const expoSdkVersion = (await sdkVersionsAsync())[sdkVersion];

  if (expoSdkVersion === undefined) {
    throw new XDLError(
      ErrorCode.INVALID_VERSION,
      `"${sdkVersion}" is not a valid Expo SDK version.`
    );
  } else if (expoSdkVersion.isDeprecated) {
    throw new XDLError(
      ErrorCode.INVALID_VERSION,
      `"${sdkVersion}" is deprecated. Please update Expo SDK version.`
    );
  }
  if (!turtleSdkVersions || !turtleSdkVersions[platform]) {
    return true;
  }

  const turtleSdkVersion = turtleSdkVersions[platform];
  return semver.gte(turtleSdkVersion, sdkVersion);
}
