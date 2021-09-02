import { ExpoConfig } from '@expo/config';
import { boolish } from 'getenv';
import semver from 'semver';
import webpack from 'webpack';

import { getConfig, getMode, getPublicPaths } from '../env';
import { Environment, Mode } from '../types';

function createEnvironmentConstants(appManifest: ExpoConfig) {
  return {
    ...appManifest,
    // @ts-ignore: displayName doesn't exist on ExpoConfig
    name: appManifest.displayName || appManifest.name,
    /**
     * Omit app.json properties that get removed during the native turtle build
     *
     * `facebookScheme`
     * `facebookAppId`
     * `facebookDisplayName`
     */
    facebookScheme: undefined,
    facebookAppId: undefined,
    facebookDisplayName: undefined,

    // Remove iOS and Android.
    ios: undefined,
    android: undefined,

    // Use the PWA `manifest.json` as the native web manifest.
    web: {
      // Pass through config properties that are not stored in the
      // PWA `manifest.json`, but still need to be accessible
      // through `Constants.manifest`.
      config: appManifest.web?.config,
    },
  };
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
 * @internal
 */
export function createClientEnvironment(
  mode: Mode,
  publicPath: string,
  nativeAppManifest: ExpoConfig
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
    env: Pick<Environment, 'projectRoot' | 'mode' | 'config' | 'locations'>
  ): DefinePlugin => {
    const mode = getMode(env);
    const { publicUrl } = getPublicPaths(env);
    const config = env.config || getConfig(env);
    return new DefinePlugin({
      mode,
      publicUrl,
      config,
    });
  };

  constructor({ mode, publicUrl, config }: { mode: Mode; publicUrl: string; config: ExpoConfig }) {
    const publicAppManifest = createEnvironmentConstants(config);
    const environmentVariables = createClientEnvironment(mode, publicUrl, publicAppManifest);
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
  } catch (e) {
    return false;
  }
}
