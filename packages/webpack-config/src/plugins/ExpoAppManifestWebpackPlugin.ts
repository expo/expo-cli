import type { ExpoConfig } from 'expo/config';

import PwaManifestWebpackPlugin, { PwaManifestOptions } from './PwaManifestWebpackPlugin';

export type ExpoPwaManifestOptions = PwaManifestOptions & {
  /**
   * The path to a template manifest.json.
   */
  template: string;
};

export default class ExpoAppManifestWebpackPlugin extends PwaManifestWebpackPlugin {
  constructor(pwaOptions: ExpoPwaManifestOptions, config: ExpoConfig) {
    super(pwaOptions, config);

    this.rel = 'expo';
  }
}
