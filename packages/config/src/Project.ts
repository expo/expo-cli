import JsonFile from '@expo/json-file';
import resolveFrom from 'resolve-from';

import { Android, IOS } from '../../config-types/build/ExpoConfig';
import { ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';

// TODO-JJ once SDK 43 is pubished, remove TempRuntimeVersion https://linear.app/expo/issue/ENG-1869/remove-tempruntimeversion-in-expoconfig
type TempRuntimeVersion = { runtimeVersion?: string | { policy: 'nativeBuildVersion' } };

export function getExpoSDKVersion(
  projectRoot: string,
  exp: Pick<ExpoConfig, 'sdkVersion'>
): string {
  if (exp?.sdkVersion) {
    return exp.sdkVersion;
  }
  const packageJsonPath = resolveFrom.silent(projectRoot, 'expo/package.json');
  if (packageJsonPath) {
    const expoPackageJson = JsonFile.read(packageJsonPath, { json5: true });
    const { version: packageVersion } = expoPackageJson;
    if (typeof packageVersion === 'string') {
      const majorVersion = packageVersion.split('.').shift();
      return `${majorVersion}.0.0`;
    }
  }
  throw new ConfigError(
    `Cannot determine which native SDK version your project uses because the module \`expo\` is not installed. Please install it with \`yarn add expo\` and try again.`,
    'MODULE_NOT_FOUND'
  );
}

export function getVersion(config: Pick<ExpoConfig, 'version'>) {
  const defaultVersion = '1.0.0';
  if (!config.version) {
    console.warn(`Using default version: "${defaultVersion}"`);
  }
  return config.version ?? defaultVersion;
}

export function getBuildNumber(config: Pick<ExpoConfig, 'ios'>) {
  const defaultBuildNumber = '1';
  if (!config.ios?.buildNumber) {
    console.warn(`Using default ios.buildNumber: "${defaultBuildNumber}"`);
  }
  return config.ios?.buildNumber ?? defaultBuildNumber;
}

export function getVersionCode(config: Pick<ExpoConfig, 'android'>) {
  const defaultVersionCode = 1;
  if (!config.android?.versionCode) {
    console.warn(`Using default android.versionCode: "${defaultVersionCode}"`);
  }
  return config.android?.versionCode ?? defaultVersionCode;
}

export function getNativeBuildVersion(
  config: Pick<ExpoConfig, 'version'> & {
    android?: Pick<Android, 'versionCode'> & TempRuntimeVersion;
    ios?: Pick<IOS, 'buildNumber'> & TempRuntimeVersion;
  },
  platform: 'android' | 'ios'
): string {
  const version = getVersion(config);
  switch (platform) {
    case 'ios': {
      const buildNumber = getBuildNumber(config);
      return `${version}(${buildNumber})`;
    }
    case 'android': {
      const versionCode = getVersionCode(config);
      return `${version}(${versionCode})`;
    }
    default: {
      throw new Error(
        `"${platform}" is not a supported platform. Choose either "ios" or "android".`
      );
    }
  }
}

export function getRuntimeVersionNullable(
  config: Pick<ExpoConfig, 'version'> &
    TempRuntimeVersion & {
      android?: Pick<Android, 'versionCode'> & TempRuntimeVersion;
      ios?: Pick<IOS, 'buildNumber'> & TempRuntimeVersion;
    },
  platform?: 'android' | 'ios'
): string | null {
  if (!platform) {
    // get top level runtime.
    if (typeof config.runtimeVersion !== 'string') {
      throw new ConfigError('You must specify a platform while using a policy', 'INVALID_CONFIG');
    }
    return config.runtimeVersion ?? null;
  }

  const runtimeVersion = config[platform]?.runtimeVersion ?? config.runtimeVersion;

  if (!runtimeVersion) {
    return null;
  } else if (typeof runtimeVersion === 'string') {
    return runtimeVersion;
  } else if (runtimeVersion['policy'] === 'nativeBuildVersion') {
    return getNativeBuildVersion(config, platform);
  }

  throw new Error(
    `"${
      typeof runtimeVersion === 'object' ? JSON.stringify(runtimeVersion) : runtimeVersion
    }" is not a valid runtime version. getRuntimeVersion only supports a string or the "nativeBuildVersion" policy.`
  );
}
