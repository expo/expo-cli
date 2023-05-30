import type { ExpoConfig } from '@expo/config';
import { boolish } from 'getenv';
import semver from 'semver';
import webpack from 'webpack';

import { getConfig, getMode, getPublicPaths } from '../env';
import { EXPO_DEBUG, sockPath } from '../env/defaults';
import { Environment, ExpoPlatform, Mode } from '../types';

const RESTRICTED_MANIFEST_FIELDS = [
  // Omit app.json properties that get removed during the native build
  'facebookScheme',
  'facebookAppId',
  'facebookDisplayName',
  // Remove iOS and Android.
  'ios',
  'android',
  // Hide internal / build values
  'plugins',
  'hooks',
  '_internal',
  // Remove metro-specific values
  'assetBundlePatterns',
];

function createEnvironmentConstants(appManifest: ExpoConfig) {
  const publicManifest: Record<string, any> = {
    ...appManifest,
    // @ts-ignore: displayName doesn't exist on ExpoConfig
    name: appManifest.displayName || appManifest.name,
    // Use the PWA `manifest.json` as the native web manifest.
    web: {
      // Pass through config properties that are not stored in the
      // PWA `manifest.json`, but still need to be accessible
      // through `Constants.manifest`.
      config: appManifest.web?.config,
    },
  };

  for (const field of RESTRICTED_MANIFEST_FIELDS) {
    delete publicManifest[field];
  }
  return publicManifest;
}

/**
 * @internal
 */
export interface ClientEnv {
  [key: string]: any;
}

/**
 * Create the global environment variables to surface in the project. Also creates the `__DEV__` boolean to provide better parity with Metro bundler.
 *
 * @param mode defines the Metro bundler `global.__DEV__` value.
 * @param publicPath passed as `process.env.PUBLIC_URL` to the app.
 * @param nativeAppManifest public values to be used in `expo-constants`.
 * @param platform native platform.
 * @internal
 */
export function createClientEnvironment(
  mode: Mode,
  publicPath: string,
  nativeAppManifest: ExpoConfig,
  platform: string
): ClientEnv {
  const environment = getMode({ mode });
  const __DEV__ = environment !== 'production';

  // Adding the env variables to the Expo manifest is unsafe.
  // This feature is deprecated in SDK 41 forward.
  const isEnvBindingSupported = lteSdkVersion(nativeAppManifest, '40.0.0');
  const ENV_VAR_REGEX = isEnvBindingSupported ? /^(EXPO_|REACT_NATIVE_|CI$)/i : /^(CI$)/i;
  const SECRET_REGEX = /(PASSWORD|SECRET|TOKEN)/i;

  const shouldDefineKeys = boolish('EXPO_WEBPACK_DEFINE_ENVIRONMENT_AS_KEYS', false);

  const prefix = shouldDefineKeys ? 'process.env.' : '';

  const processEnv = Object.keys(process.env)
    .filter(key => ENV_VAR_REGEX.test(key) && !SECRET_REGEX.test(key))
    .reduce(
      (env, key) => {
        env[`${prefix}${key}`] = JSON.stringify(process.env[key]);
        return env;
      },
      {
        /**
         * Useful for determining whether we’re running in production mode.
         * Most importantly, it switches React into the correct mode.
         */
        [`${prefix}NODE_ENV`]: JSON.stringify(environment),

        /**
         * Useful for resolving the correct path to static assets in `public`.
         * For example, <img src={process.env.PUBLIC_URL + '/img/logo.png'} />.
         * This should only be used as an escape hatch. Normally you would put
         * images into the root folder and `import` them in code to get their paths.
         */
        [`${prefix}PUBLIC_URL`]: JSON.stringify(publicPath),

        /**
         * Surfaces the `app.json` (config) as an environment variable which is then parsed by
         * `expo-constants` https://docs.expo.dev/versions/latest/sdk/constants/
         */
        [`${prefix}APP_MANIFEST`]: JSON.stringify(nativeAppManifest),

        [`${prefix}EXPO_DEBUG`]: EXPO_DEBUG,
        [`${prefix}PLATFORM`]: JSON.stringify(platform),
        // [`${prefix}WDS_SOCKET_HOST`]: process.env.WDS_SOCKET_HOST,
        // [`${prefix}WDS_SOCKET_PORT`]: process.env.WDS_SOCKET_PORT,
        [`${prefix}WDS_SOCKET_PATH`]: sockPath ? JSON.stringify(sockPath) : undefined,
      } as Record<string, string>
    );

  if (shouldDefineKeys) {
    return {
      ...processEnv,
      __DEV__,
    };
  }

  return {
    'process.env': processEnv,
    __DEV__,
  };
}

/**
 * Required for `expo-constants` https://docs.expo.dev/versions/latest/sdk/constants/.
 * This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.
 * @category plugins
 */
export default class DefinePlugin extends webpack.DefinePlugin {
  static createClientEnvironment = createClientEnvironment;
  static fromEnv = (
    env: Pick<Environment, 'projectRoot' | 'mode' | 'config' | 'locations' | 'platform'>
  ): DefinePlugin => {
    const mode = getMode(env);
    const { publicUrl } = getPublicPaths(env);
    const config = env.config || getConfig(env);
    return new DefinePlugin({
      mode,
      publicUrl,
      config,
      platform: env.platform,
    });
  };

  constructor({
    mode,
    publicUrl,
    config,
    platform,
  }: {
    mode: Mode;
    publicUrl: string;
    config: ExpoConfig;
    platform: ExpoPlatform;
  }) {
    const publicAppManifest = createEnvironmentConstants(config);

    const environmentVariables = createClientEnvironment(
      mode,
      publicUrl,
      publicAppManifest as any,
      platform
    );

    super(environmentVariables);
  }
}

function lteSdkVersion(exp: Pick<ExpoConfig, 'sdkVersion'>, sdkVersion: string): boolean {
  if (!exp.sdkVersion) {
    return false;
  }

  if (exp.sdkVersion === 'UNVERSIONED') {
    return false;
  }

  try {
    return semver.lte(exp.sdkVersion, sdkVersion);
  } catch {
    return false;
  }
}
