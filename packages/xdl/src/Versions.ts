import { ApiV2 as ApiV2Client, UserManager } from '@expo/api';
import { ExpoConfig } from '@expo/config';
import { JSONObject } from '@expo/json-file';
import getenv from 'getenv';
import pickBy from 'lodash/pickBy';
import path from 'path';
import semver from 'semver';

import { FsCache, XDLError } from './internal';

export type SDKVersion = {
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
  iosClientUrl?: string;
  iosClientVersion?: string;
  androidClientUrl?: string;
  androidClientVersion?: string;
  relatedPackages?: { [name: string]: string };
  beta?: boolean;
};

export type SDKVersions = { [version: string]: SDKVersion };
type TurtleSDKVersions = { android: string[]; ios: string[] };
type TurtleSDKVersionsOld = { android: string; ios: string };

type Versions = {
  androidUrl: string;
  androidVersion: string;
  iosUrl: string;
  iosVersion: string;
  sdkVersions: SDKVersions;
  /* deprecated */ starterApps: unknown;
  /* deprecated */ templates: unknown[];
  /* deprecated */ templatesv2: unknown[];
  turtleSdkVersions: TurtleSDKVersionsOld;
};

export async function versionsAsync(options?: { skipCache?: boolean }): Promise<Versions> {
  const api = new ApiV2Client();
  const versionCache = new FsCache.Cacher(
    () => api.getAsync('versions/latest'),
    'versions.json',
    0,
    path.join(__dirname, '../caches/versions.json')
  );

  // Clear cache when opting in to beta because things can change quickly in beta
  if (getenv.boolish('EXPO_BETA', false) || options?.skipCache) {
    versionCache.clearAsync();
  }

  return await versionCache.getAsync();
}

export async function sdkVersionsAsync(): Promise<SDKVersions> {
  const { sdkVersions } = await versionsAsync();
  return sdkVersions;
}

export async function setVersionsAsync(value: any) {
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

// NOTE(brentvatne): it is possible for an unreleased version to be published to
// the versions endpoint, but in some cases we only want to list out released
// versions
export async function releasedSdkVersionsAsync(): Promise<SDKVersions> {
  const sdkVersions = await sdkVersionsAsync();
  return pickBy(
    sdkVersions,
    (data, _sdkVersionString) =>
      !!data.releaseNoteUrl || (getenv.boolish('EXPO_BETA', false) && data.beta)
  );
}

export function gteSdkVersion(
  expJson: Pick<ExpoConfig, 'sdkVersion'>,
  sdkVersion: string
): boolean {
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

export function lteSdkVersion(
  expJson: Pick<ExpoConfig, 'sdkVersion'>,
  sdkVersion: string
): boolean {
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

// NOTE(brentvatne): it is possible for an unreleased version to be published to
// the versions endpoint, but in some cases we need to get the latest *released*
// version, not just the latest version.
export async function newestReleasedSdkVersionAsync(): Promise<{
  version: string;
  data: SDKVersion | null;
}> {
  const betaOptInEnabled = getenv.boolish('EXPO_BETA', false);
  const sdkVersions = await sdkVersionsAsync();

  let result = null;
  let highestMajorVersion = '0.0.0';

  for (const [version, data] of Object.entries(sdkVersions)) {
    const hasReleaseNotes = !!data.releaseNoteUrl;
    const isBeta = !!data.beta;

    if (
      semver.major(version) > semver.major(highestMajorVersion) &&
      (hasReleaseNotes || (isBeta && betaOptInEnabled))
    ) {
      highestMajorVersion = version;
      result = data;
    }
  }
  return {
    version: highestMajorVersion,
    data: result,
  };
}

/**
 * Be careful when using this! It can include unreleased and beta SDK versions.
 */
export async function newestSdkVersionAsync(): Promise<{
  version: string;
  data: SDKVersion | null;
}> {
  const sdkVersions = await sdkVersionsAsync();
  let result = null;
  let highestMajorVersion = '0.0.0';
  for (const [version, data] of Object.entries(sdkVersions)) {
    if (semver.major(version) > semver.major(highestMajorVersion)) {
      highestMajorVersion = version;
      result = data;
    }
  }
  return {
    version: highestMajorVersion,
    data: result,
  };
}

export async function oldestSupportedMajorVersionAsync(): Promise<number> {
  const sdkVersions = await sdkVersionsAsync();
  const supportedVersions = pickBy(sdkVersions, v => !v.isDeprecated);
  const versionNumbers = Object.keys(supportedVersions).map(version => semver.major(version));
  return Math.min(...versionNumbers);
}

export async function facebookReactNativeVersionsAsync(): Promise<string[]> {
  const sdkVersions = await sdkVersionsAsync();
  const facebookReactNativeVersions = new Set(
    Object.values(sdkVersions)
      .map(data => data.facebookReactNativeVersion)
      .filter(version => version)
  );
  return Array.from(facebookReactNativeVersions);
}

export async function facebookReactNativeVersionToExpoVersionAsync(
  outerFacebookReactNativeVersion: string
): Promise<string | null> {
  if (!semver.valid(outerFacebookReactNativeVersion)) {
    throw new XDLError(
      'INVALID_VERSION',
      `${outerFacebookReactNativeVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }

  const sdkVersions = await releasedSdkVersionsAsync();
  let currentSdkVersion: string | null = null;

  for (const [version, { facebookReactNativeVersion }] of Object.entries(sdkVersions)) {
    if (
      semver.major(outerFacebookReactNativeVersion) === semver.major(facebookReactNativeVersion) &&
      semver.minor(outerFacebookReactNativeVersion) === semver.minor(facebookReactNativeVersion) &&
      (!currentSdkVersion || semver.gt(version, currentSdkVersion))
    ) {
      currentSdkVersion = version;
    }
  }

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

  const supportedVersions = await getSdkVersionsSupportedByTurtle();
  const supportedVersionsForPlatform: string[] = supportedVersions[platform] ?? [];
  return supportedVersionsForPlatform.indexOf(sdkVersion) !== -1;
}

async function getSdkVersionsSupportedByTurtle(): Promise<TurtleSDKVersions> {
  const api = new ApiV2Client();
  return await api.getAsync('standalone-build/supportedSDKVersions');
}
