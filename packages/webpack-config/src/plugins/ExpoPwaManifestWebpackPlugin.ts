import { ExpoConfig } from '@expo/config';

import { generateManifestJson } from '@expo/pwa';

import fs from 'fs-extra';
import PwaManifestWebpackPlugin, { PwaManifestOptions } from './PwaManifestWebpackPlugin';

export type ExpoPwaManifestOptions = PwaManifestOptions & {
  /**
   * The path to a template manifest.json.
   */
  template: string;
};

export default class ExpoPwaManifestWebpackPlugin extends PwaManifestWebpackPlugin {
  constructor(pwaOptions: ExpoPwaManifestOptions, config: ExpoConfig) {
    let inputJson: any;
    try {
      if (fs.existsSync(pwaOptions.template)) {
        inputJson = JSON.parse(fs.readFileSync(pwaOptions.template, { encoding: 'utf8' }));
      }
    } catch (error) {
      console.log('failed to use template PWA manifest: ' + error);
    }

    if (!inputJson) inputJson = generateManifestJson({}, config);

    super(pwaOptions, inputJson);
  }
}
