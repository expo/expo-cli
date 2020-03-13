import { ExpoConfig } from '@expo/config';

import { generateManifestJson } from '@expo/pwa';

import fs from 'fs-extra';
import PwaManifestWebpackPlugin from './PwaManifestWebpackPlugin';

export default class ExpoPwaManifestWebpackPlugin extends PwaManifestWebpackPlugin {
  constructor(
    pwaOptions: { template: string; path: string; inject?: boolean | Function; publicPath: string },
    config: ExpoConfig
  ) {
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
