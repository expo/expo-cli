import _ from 'lodash';
import fs from 'fs-extra';

import BaseUploader from './BaseUploader';
import { printFastlaneError, spawnAndCollectJSONOutputAsync } from './utils';
import prompt from '../../prompt';
import log from '../../log';

const PLATFORM = 'android';

export default class AndroidUploader extends BaseUploader {
  constructor(projectDir, options) {
    super(PLATFORM, projectDir, options);
  }

  _ensureExperienceIsValid(exp) {
    if (!_.has(exp, 'android.package')) {
      throw new Error('You must specify an Android package in app.json.');
    }
  }

  async _getPlatformSpecificOptions() {
    let { key } = this.options;
    if (!key) {
      log('You can specify JSON file using --key option');
      const userInput = await prompt({
        name: 'key',
        message:
          'Path to the service account JSON file used to authenticate with Google Play Store:',
        type: 'input',
      });
      key = userInput.key;
    }
    if (!await fs.exists(key)) {
      throw new Error(`No such file: ${key}`);
    }
    return { key };
  }

  async _uploadToTheStore({ key }, path) {
    const { android: { package: androidPackage } } = this._exp;
    const { fastlane } = this;
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
