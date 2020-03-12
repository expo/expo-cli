import { ExpoConfig, createPWAManifestFromConfig } from '@expo/config';

import PwaManifestWebpackPlugin from './PwaManifestWebpackPlugin';

export default class ExpoPwaManifestWebpackPlugin extends PwaManifestWebpackPlugin {
  constructor(
    pwaOptions: { path: string; inject?: boolean | Function; publicPath: string },
    config: ExpoConfig
  ) {
    super(pwaOptions, createPWAManifestFromConfig(config));
  }
}
