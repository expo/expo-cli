import path from 'path';

import { ExpoConfig, Platform } from '@expo/config';
import { JSONObject } from '@expo/json-file';
import forEach from 'lodash/forEach';
import pickBy from 'lodash/pickBy';
import semver from 'semver';

import ApiV2Client from './ApiV2';
import { Cacher } from './tools/FsCache';
import XDLError from './XDLError';
import UserManager from './User';

type SDKVersion = {
  androidExpoViewUrl?: string;
  expoReactNativeTag: string;
  /* deprecated */ exponentReactNativeTag?: string;
  expokitNpmPackage?: string;
  facebookReactNativeVersion: string;
  facebookReactVersion?: string;
  iosExpoViewUrl?: string;
  /* deprecated */ iosExponentViewUrl?: string;
  iosVersion?: string;
  isDeprecated?: boolean;
  packagesToInstallWhenEjecting?: { [name: string]: string };
  releaseNoteUrl?: string;
};

type SDKVersions = { [version: string]: SDKVersion };
type TurtleSDKVersions = { android: string; ios: string };

type Versions = {
  androidUrl: 'https://d1ahtucjixef4r.cloudfront.net/Exponent-2.11.4.apk';
  androidVersion: '2.11.4';
  iosUrl: 'https://dpq5q02fu5f55.cloudfront.net/Exponent-2.11.1.tar.gz';
  iosVersion: '2.11.1';
  sdkVersions: SDKVersions;
  /* deprecated */ starterApps: unknown;
  /* deprecated */ templates: unknown[];
  /* deprecated */ templatesv2: unknown[];
  turtleSdkVersions: TurtleSDKVersions;
};

export async function versionsAsync(): Promise<Versions> {
  const api = new ApiV2Client();
  const versionCache = new Cacher(
    () => api.getAsync('versions/latest'),
    'versions.json',
    0,
    path.join(__dirname, '../caches/versions.json')
  );
  return await versionCache.getAsync();
}

export async function sdkVersionsAsync(): Promise<SDKVersions> {
  const { sdkVersions } = await versionsAsync();
  return sdkVersions;
}

export async function turtleSdkVersionsAsync(): Promise<TurtleSDKVersions> {
  const { turtleSdkVersions } = await versionsAsync();
  return turtleSdkVersions;
}

export async function setVersionsAsync(value: any): Promise<void> {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  const secret = process.env.EXPO_VERSIONS_SECRET;
  if (!secret)
    throw new Error(
      'Versions.setVersionsAsync: EXPO_VERSIONS_SECRET environment variable is required'
    );
  await api.postAsync('versions/update', {
    value: value as JSONObject,
    secret,
  });
}

export function gteSdkVersion(expJson: ExpoConfig, sdkVersion: string): boolean {
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
      'INVALID_VERSION',
      `${expJson.sdkVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }
}

export function lteSdkVersion(expJson: ExpoConfig, sdkVersion: string): boolean {
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
      'INVALID_VERSION',
      `${expJson.sdkVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }
}

export function parseSdkVersionFromTag(tag: string): string {
  if (tag.startsWith('sdk-')) {
    return tag.substring(4);
  }

  return tag;
}

export async function newestSdkVersionAsync(): Promise<{
  version: string;
  data: SDKVersion | null;
}> {
  let sdkVersions = await sdkVersionsAsync();
  let result = null;
  let highestMajorVersion = '0.0.0';
  forEach(sdkVersions, (value, key) => {
    if (semver.major(key) > semver.major(highestMajorVersion)) {
      highestMajorVersion = key;
      result = value;
    }
  });
  return {
    version: highestMajorVersion,
    data: result,
  };
}

export async function oldestSupportedMajorVersionAsync(): Promise<number> {
  const sdkVersions = await sdkVersionsAsync();
  const supportedVersions = pickBy(sdkVersions, v => !v.isDeprecated);
  let versionNumbers: number[] = [];
  forEach(supportedVersions, (value, key) => {
    versionNumbers.push(semver.major(key));
  });
  return Math.min(...versionNumbers);
}

export async function facebookReactNativeVersionsAsync(): Promise<string[]> {
  let sdkVersions = await sdkVersionsAsync();
  let facebookReactNativeVersions = new Set<string>();

  forEach(sdkVersions, value => {
    if (value.facebookReactNativeVersion) {
      facebookReactNativeVersions.add(value.facebookReactNativeVersion);
    }
  });

  return Array.from(facebookReactNativeVersions);
}

export async function facebookReactNativeVersionToExpoVersionAsync(
  facebookReactNativeVersion: string
): Promise<string | null> {
  if (!semver.valid(facebookReactNativeVersion)) {
    throw new XDLError(
      'INVALID_VERSION',
      `${facebookReactNativeVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }

  let sdkVersions = await sdkVersionsAsync();
  let currentSdkVersion: string | null = null;

  forEach(sdkVersions, (value, key) => {
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

export async function canTurtleBuildSdkVersion(
  sdkVersion: string,
  platform: keyof TurtleSDKVersions
): Promise<boolean> {
  if (sdkVersion === 'UNVERSIONED') {
    return true;
  }

  if (semver.valid(sdkVersion) == null) {
    throw new XDLError(
      'INVALID_VERSION',
      `"${sdkVersion}" is not a valid version. Must be in the form of x.y.z`
    );
  }

  const turtleSdkVersions = await turtleSdkVersionsAsync();
  const expoSdkVersion = (await sdkVersionsAsync())[sdkVersion];

  if (expoSdkVersion === undefined) {
    throw new XDLError('INVALID_VERSION', `"${sdkVersion}" is not a valid Expo SDK version.`);
  } else if (expoSdkVersion.isDeprecated) {
    throw new XDLError(
      'INVALID_VERSION',
      `"${sdkVersion}" is deprecated. Please update Expo SDK version.`
    );
  }
  if (!turtleSdkVersions || !turtleSdkVersions[platform]) {
    return true;
  }

  const turtleSdkVersion = turtleSdkVersions[platform];
  return semver.gte(turtleSdkVersion, sdkVersion);
}
