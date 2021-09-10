import { Android, ExpoConfig, IOS } from '@expo/config-types';
import { getRuntimeVersionForSDKVersion } from '@expo/sdk-runtime-versions';

import { AndroidConfig, IOSConfig } from '..';

export type ExpoConfigUpdates = Pick<
  ExpoConfig,
  'sdkVersion' | 'owner' | 'runtimeVersion' | 'updates' | 'slug'
>;

// TODO(JJ) once SDK 43 is pubished, remove TempRuntimeVersion https://linear.app/expo/issue/ENG-1869/remove-tempruntimeversion-in-expoconfig
type TempRuntimeVersion = { runtimeVersion?: string | { policy: 'nativeVersion' | 'sdkVersion' } };

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
    android?: Pick<Android, 'versionCode'> & TempRuntimeVersion;
    ios?: Pick<IOS, 'buildNumber'> & TempRuntimeVersion;
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
export const withRuntimeVersion: (
  config: ExpoConfig & { ios?: TempRuntimeVersion; android?: TempRuntimeVersion }
) => ExpoConfig = config => {
  if (config.ios?.runtimeVersion || config.runtimeVersion) {
    config.ios = {
      ...config.ios,
      runtimeVersion: getRuntimeVersion(config, 'ios'),
    } as any; //TODO(JJ) remove this cast in SDK 43 https://linear.app/expo/issue/ENG-1869/remove-tempruntimeversion-in-expoconfig
  }
  if (config.android?.runtimeVersion || config.runtimeVersion) {
    config.android = {
      ...config.android,
      runtimeVersion: getRuntimeVersion(config, 'android'),
    } as any; //TODO(JJ) remove this cast in SDK 43 https://linear.app/expo/issue/ENG-1869/remove-tempruntimeversion-in-expoconfig
  }
  delete config.runtimeVersion;
  return config;
};

export function getRuntimeVersion(
  config: Pick<ExpoConfig, 'version' | 'sdkVersion'> &
    TempRuntimeVersion & {
      android?: Pick<Android, 'versionCode'> & TempRuntimeVersion;
      ios?: Pick<IOS, 'buildNumber'> & TempRuntimeVersion;
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
      throw new Error("An sdk version must be defined when using the 'sdkVersion' runtime policy.");
    }
    return getRuntimeVersionForSDKVersion(config.sdkVersion);
  }

  throw new Error(
    `"${
      typeof runtimeVersion === 'object' ? JSON.stringify(runtimeVersion) : runtimeVersion
    }" is not a valid runtime version. getRuntimeVersion only supports a string, "sdkVersion", or "nativeVersion" policy.`
  );
}
