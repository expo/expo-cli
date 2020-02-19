import { ExpoConfig, createEnvironmentConstants } from '@expo/config';
import { DefinePlugin } from 'webpack';

import { Environment, Mode } from '../types';
import { getConfig, getMode, getPaths, getPublicPaths } from '../env';

/**
 * @internal
 */
export interface ClientEnv {
  __DEV__: boolean;
  'process.env': { [key: string]: string };
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

  const ENV_VAR_REGEX = /^(EXPO_|REACT_NATIVE_|CI$)/i;
  const SECRET_REGEX = /(PASSWORD|SECRET|TOKEN)/i;

  const processEnv = Object.keys(process.env)
    .filter(key => ENV_VAR_REGEX.test(key) && !SECRET_REGEX.test(key))
    .reduce(
      (env, key) => {
        env[key] = JSON.stringify(process.env[key]);
        return env;
      },
      {
        /**
         * Useful for determining whether we’re running in production mode.
         * Most importantly, it switches React into the correct mode.
         */
        NODE_ENV: JSON.stringify(environment),

        /**
         * Useful for resolving the correct path to static assets in `public`.
         * For example, <img src={process.env.PUBLIC_URL + '/img/logo.png'} />.
         * This should only be used as an escape hatch. Normally you would put
         * images into the root folder and `import` them in code to get their paths.
         */
        PUBLIC_URL: JSON.stringify(publicPath),

        /**
         * Surfaces the `app.json` (config) as an environment variable which is then parsed by
         * `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
         */
        APP_MANIFEST: JSON.stringify(nativeAppManifest),
      } as { [key: string]: string }
    );
  return {
    'process.env': processEnv,
    __DEV__,
  };
}

/**
 * Required for `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/.
 * This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.
 * @category plugins
 */
export default class ExpoDefinePlugin extends DefinePlugin {
  static createClientEnvironment = createClientEnvironment;
  static fromEnv = (
    env: Pick<Environment, 'projectRoot' | 'mode' | 'config' | 'locations'>
  ): ExpoDefinePlugin => {
    const mode = getMode(env);
    const { publicUrl } = getPublicPaths(env);
    const config = env.config || getConfig(env);
    const locations = env.locations || getPaths(env.projectRoot, mode);
    const productionManifestPath = locations.production.manifest;
    return new ExpoDefinePlugin({
      mode,
      publicUrl,
      config,
      productionManifestPath,
    });
  };

  constructor({
    mode,
    publicUrl,
    productionManifestPath,
    config,
  }: {
    mode: Mode;
    publicUrl: string;
    productionManifestPath: string;
    config: ExpoConfig;
  }) {
    const publicAppManifest = createEnvironmentConstants(config, productionManifestPath);

    const environmentVariables = createClientEnvironment(mode, publicUrl, publicAppManifest);

    super(environmentVariables);
  }
}
