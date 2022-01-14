import { ExpoConfig } from '@expo/config-types';
import path from 'path';
import semver from 'semver';

import ApiV2Client from './ApiV2';
import { Cache } from './Cache';
import Env from './Env';
import { ApiError } from './utils/errors';

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
  const versionCache = new Cache({
    getAsync: () => api.getAsync('versions/latest'),
    filename: 'versions.json',
    ttlMilliseconds: 0,
    bootstrapFile: path.join(__dirname, '../caches/versions.json'),
  });

  // Clear cache when opting in to beta because things can change quickly in beta
  if (Env.EXPO_BETA || options?.skipCache) {
    versionCache.clearAsync();
  }

  return await versionCache.getAsync();
}

export async function sdkVersionsAsync(): Promise<SDKVersions> {
  const { sdkVersions } = await versionsAsync();
  return sdkVersions;
}

// NOTE(brentvatne): it is possible for an unreleased version to be published to
// the versions endpoint, but in some cases we only want to list out released
// versions
export async function releasedSdkVersionsAsync(): Promise<SDKVersions> {
  const sdkVersions = await sdkVersionsAsync();
  return pickBy(
    sdkVersions,
    (data, _sdkVersionString) => !!data.releaseNoteUrl || (Env.EXPO_BETA && data.beta)
  );
}

/** v1 >= v2. UNVERSIONED == true. nullish == false.  */
export function gte(v1: ExpoConfig['sdkVersion'], sdkVersion: string): boolean {
  if (!v1) {
    return false;
  }

  if (v1 === 'UNVERSIONED') {
    return true;
  }

  try {
    return semver.gte(v1, sdkVersion);
  } catch (e) {
    throw new ApiError(
      'INVALID_VERSION',
      `'${v1}' is not a valid version. Must be in the form of x.y.z`
    );
  }
}

/** v1 <= v2. UNVERSIONED == false. nullish == false.  */
export function lte(v1: ExpoConfig['sdkVersion'], v2: string): boolean {
  if (!v1 || v1 === 'UNVERSIONED') {
    return false;
  }

  try {
    return semver.lte(v1, v2);
  } catch {
    throw new ApiError(
      'INVALID_VERSION',
      `'${v1}' is not a valid version. Must be in the form of x.y.z`
    );
  }
}

export function assertValid(sdkVersion: string): boolean {
  if (sdkVersion === 'UNVERSIONED') {
    return true;
  }

  if (semver.valid(sdkVersion) == null) {
    throw new ApiError(
      'INVALID_VERSION',
      `"${sdkVersion}" is not a valid version. Must be in the form of x.y.z`
    );
  }
  return true;
}

// NOTE(brentvatne): it is possible for an unreleased version to be published to
// the versions endpoint, but in some cases we need to get the latest *released*
// version, not just the latest version.
export async function newestReleasedSdkVersionAsync(): Promise<{
  version: string;
  data: SDKVersion | null;
}> {
  const sdkVersions = await sdkVersionsAsync();

  let result = null;
  let highestMajorVersion = '0.0.0';

  for (const [version, data] of Object.entries(sdkVersions)) {
    const hasReleaseNotes = !!data.releaseNoteUrl;
    const isBeta = !!data.beta;

    if (
      semver.major(version) > semver.major(highestMajorVersion) &&
      (hasReleaseNotes || (isBeta && Env.EXPO_BETA))
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

export async function oldestSupportedMajorVersionAsync(): Promise<number> {
  const sdkVersions = await sdkVersionsAsync();
  const supportedVersions = pickBy(sdkVersions, v => !v.isDeprecated);
  const versionNumbers = Object.keys(supportedVersions).map(version => semver.major(version));
  return Math.min(...versionNumbers);
}

function pickBy<T>(
  obj: { [key: string]: T },
  predicate: (value: T, key: string) => boolean | undefined
) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (predicate(value, key)) {
      acc[key] = value;
    }
    return acc;
  }, {} as { [key: string]: T });
}
