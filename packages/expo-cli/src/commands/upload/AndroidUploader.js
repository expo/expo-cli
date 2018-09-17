import fs from 'fs';
import prompt from '../../prompt';
import log from '../../log';

import BaseUploader from './BaseUploader';
import { printFastlaneError, spawnAndCollectJSONOutputAsync } from './utils';

export default class AndroidUploader extends BaseUploader {
  constructor(projectDir, options) {
    const args = {
      projectDir,
      options,
      platform: 'android',
      platformName: 'Android',
      platformExtension: 'apk',
    };
    super(args);
  }

  ensurePlatformOptionsAreCorrect() {
    const { key } = this.options;
    if (key && !fs.existsSync(key)) {
      throw new Error(`No such file: ${key}`);
    }
  }

  ensureConfigDataIsCorrect(configData) {
    const { android } = configData;
    if (!android || !android.package) {
      throw new Error(`You must specify a package in order to upload apk file.`);
    }
  }

  async getPlatformData() {
    if (!this.options.key) {
      log('You can specify json file ID using --key option');
      const { key } = await prompt({
        name: 'key',
        message: 'The service account json file used to authenticate with Google Play Store:',
        type: 'input',
      });
      if (!fs.existsSync(key)) {
        throw new Error(`No such file: ${key}`);
      }
      return { key };
    }
    return { key: this.options.key };
  }

  async uploadToStore({ android: { package: androidPackage } }, { key }, path) {
    const fastlane = this.fastlane;
    const supply = await spawnAndCollectJSONOutputAsync(fastlane.app_supply, [
      androidPackage,
      path,
      key,
    ]);
    if (supply.result !== 'success') {
      printFastlaneError(supply, 'supply');
    }
  }
}
