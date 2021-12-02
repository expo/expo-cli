import { Android, ExpoConfig, IOS } from '@expo/config-types';
import { getRuntimeVersionForSDKVersion } from '@expo/sdk-runtime-versions';
import fs from 'fs';
import { boolish } from 'getenv';
import resolveFrom from 'resolve-from';

import { AndroidConfig, IOSConfig } from '..';

export type ExpoConfigUpdates = Pick<
  ExpoConfig,
  'sdkVersion' | 'owner' | 'runtimeVersion' | 'updates' | 'slug'
>;

export function getExpoUpdatesPackageVersion(projectRoot: string): string | null {
  const expoUpdatesPackageJsonPath = resolveFrom.silent(projectRoot, 'expo-updates/package.json');
  if (!expoUpdatesPackageJsonPath || !fs.existsSync(expoUpdatesPackageJsonPath)) {
    return null;
  }
  const packageJson = JSON.parse(fs.readFileSync(expoUpdatesPackageJsonPath, 'utf8'));
  return packageJson.version;
}

export function getUpdateUrl(
  config: Pick<ExpoConfigUpdates, 'owner' | 'slug' | 'updates'>,
  username: string | null
): string | null {
  if (config.updates?.url) {
    return config.updates?.url;
  }

  const user = typeof config.owner === 'string' ? config.owner : username;
  if (!user) {
    return null;
  }
  return `https://exp.host/@${user}/${config.slug}`;
}

export function getNativeVersion(
  config: Pick<ExpoConfig, 'version'> & {
    android?: Pick<Android, 'versionCode'>;
    ios?: Pick<IOS, 'buildNumber'>;
  },
  platform: 'android' | 'ios'
): string {
  const version = IOSConfig.Version.getVersion(config);
  switch (platform) {
    case 'ios': {
      const buildNumber = IOSConfig.Version.getBuildNumber(config);
      return `${version}(${buildNumber})`;
    }
    case 'android': {
      const versionCode = AndroidConfig.Version.getVersionCode(config);
      return `${version}(${versionCode})`;
    }
    default: {
      throw new Error(
        `"${platform}" is not a supported platform. Choose either "ios" or "android".`
      );
    }
  }
}

/**
 * Compute runtime version policies.
 * @return an expoConfig with only string valued platform specific runtime versions.
 */
export const withRuntimeVersion: (config: ExpoConfig) => ExpoConfig = config => {
  if (config.ios?.runtimeVersion || config.runtimeVersion) {
    config.ios = {
      ...config.ios,
      runtimeVersion: getRuntimeVersion(config, 'ios'),
    };
  }
  if (config.android?.runtimeVersion || config.runtimeVersion) {
    config.android = {
      ...config.android,
      runtimeVersion: getRuntimeVersion(config, 'android'),
    };
  }
  delete config.runtimeVersion;
  return config;
};

export function getRuntimeVersionNullable(
  ...[config, platform]: Parameters<typeof getRuntimeVersion>
): string | null {
  try {
    return getRuntimeVersion(config, platform);
  } catch (e) {
    if (boolish('EXPO_DEBUG', false)) {
      console.log(e);
    }
    return null;
  }
}

export function getRuntimeVersion(
  config: Pick<ExpoConfig, 'version' | 'runtimeVersion' | 'sdkVersion'> & {
    android?: Pick<Android, 'versionCode' | 'runtimeVersion'>;
    ios?: Pick<IOS, 'buildNumber' | 'runtimeVersion'>;
  },
  platform: 'android' | 'ios'
): string {
  const runtimeVersion = config[platform]?.runtimeVersion ?? config.runtimeVersion;
  if (!runtimeVersion) {
    throw new Error(
      `There is neither a value or a policy set for the runtime version on "${platform}"`
    );
  }

  if (typeof runtimeVersion === 'string') {
    return runtimeVersion;
  } else if (runtimeVersion.policy === 'nativeVersion') {
    return getNativeVersion(config, platform);
  } else if (runtimeVersion.policy === 'sdkVersion') {
    if (!config.sdkVersion) {
      throw new Error("An SDK version must be defined when using the 'sdkVersion' runtime policy.");
    }
    return getRuntimeVersionForSDKVersion(config.sdkVersion);
  }

  throw new Error(
    `"${
      typeof runtimeVersion === 'object' ? JSON.stringify(runtimeVersion) : runtimeVersion
    }" is not a valid runtime version. getRuntimeVersion only supports a string, "sdkVersion", or "nativeVersion" policy.`
  );
}
