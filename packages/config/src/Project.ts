import JsonFile from '@expo/json-file';
import resolveFrom from 'resolve-from';

import { Android, IOS } from '../../config-types/build/ExpoConfig';
import { ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';

// TODO-JJ once SDK 43 is pubished, remove TempRuntimeVersion https://linear.app/expo/issue/ENG-1869/remove-tempruntimeversion-in-expoconfig
type TempRuntimeVersion = { runtimeVersion?: string | { policy: 'nativeVersion' } };

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

export function getNativeVersion(
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

export function getRuntimeVersion(
  config: Pick<ExpoConfig, 'version'> &
    TempRuntimeVersion & {
      android?: Pick<Android, 'versionCode'> & TempRuntimeVersion;
      ios?: Pick<IOS, 'buildNumber'> & TempRuntimeVersion;
    },
  platform: 'android' | 'ios'
): string {
  const runtimeVersion = config[platform]?.runtimeVersion ?? config.runtimeVersion;

  if (typeof runtimeVersion === 'string') {
    return runtimeVersion;
  } else if (!runtimeVersion || runtimeVersion['policy'] === 'nativeVersion') {
    return getNativeVersion(config, platform);
  }

  throw new Error(
    `"${
      typeof runtimeVersion === 'object' ? JSON.stringify(runtimeVersion) : runtimeVersion
    }" is not a valid runtime version. getRuntimeVersion only supports a string or the "nativeVersion" policy.`
  );
}
