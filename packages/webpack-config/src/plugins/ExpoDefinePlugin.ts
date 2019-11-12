import { ExpoConfig, createEnvironmentConstants } from '@expo/config';
import { DefinePlugin } from 'webpack';

import createClientEnvironment from '../createClientEnvironment';
import { Environment, Mode } from '../types';
import { getConfig, getMode, getPaths, getPublicPaths } from '../env';

/**
 * Required for `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
 * This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.
 */
export default class ExpoDefinePlugin extends DefinePlugin {
  static fromEnv = (
    env: Pick<Environment, 'projectRoot' | 'mode' | 'config' | 'locations'>
  ): ExpoDefinePlugin => {
    const mode = getMode(env);
    const { publicUrl } = getPublicPaths(env);
    const config = env.config || getConfig(env);
    const locations = env.locations || getPaths(env.projectRoot);
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
