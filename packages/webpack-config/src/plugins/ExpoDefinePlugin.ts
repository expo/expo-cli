import { ExpoConfig } from '@expo/config';
import { DefinePlugin } from 'webpack';
import { createEnvironmentConstants } from '@expo/config';
import createClientEnvironment from '../createClientEnvironment';
import { Mode } from '../types';

/**
 * Required for `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
 * This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.
 */
export default class ExpoDefinePlugin extends DefinePlugin {
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
