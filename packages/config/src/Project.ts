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

export function getNativeBuildVersion(
  config: Pick<ExpoConfig, 'version'> & {
    android?: Pick<Android, 'versionCode'> & TempRuntimeVersion;
    ios?: Pick<IOS, 'buildNumber'> & TempRuntimeVersion;
  },
  platform: 'android' | 'ios'
): string {
  if (!config.version) {
    throw new ConfigError('Missing "version" field', 'INVALID_CONFIG');
  }
  switch (platform) {
    case 'ios': {
      if (!config.ios?.buildNumber) {
        throw new ConfigError(
          'The "ios.buildNumber" field is required when computing the native build version for ios.',
          'INVALID_CONFIG'
        );
      }
      return `${config.version}(${config.ios.buildNumber})`;
    }
    case 'android': {
      if (!config.android?.versionCode) {
        throw new ConfigError(
          'The "android.versionCode" field is required when computing the native build version for android.',
          'INVALID_CONFIG'
        );
      }
      return `${config.version}(${config.android.versionCode})`;
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
