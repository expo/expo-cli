import { ExpoConfig } from '@expo/config';

import { generateManifestJson } from '@expo/pwa';

import PwaManifestWebpackPlugin from './PwaManifestWebpackPlugin';

export default class ExpoPwaManifestWebpackPlugin extends PwaManifestWebpackPlugin {
  constructor(
    pwaOptions: { path: string; inject?: boolean | Function; publicPath: string },
    config: ExpoConfig
  ) {
    super(pwaOptions, generateManifestJson({}, config));
  }
}
