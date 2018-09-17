import prompt from '../../prompt';
import log from '../../log';

import BaseUploader from './BaseUploader';
import { printFastlaneError, spawnAndCollectJSONOutputAsync } from './utils';

export default class IOSUploader extends BaseUploader {
  constructor(projectDir, options) {
    const args = {
      projectDir,
      options,
      platform: 'ios',
      platformName: 'iOS',
      platformExtension: 'ipa',
    };
    super(args);
  }

  ensureConfigDataIsCorrect(configData) {
    const { ios } = configData;
    if (!ios || !ios.bundleIdentifier) {
      throw new Error(`Must specify a bundle identifier in order to upload ipa file.`);
    }
  }

  async getPlatformData() {
    if (!this.options.appleId) {
      log('You can specify your Apple ID using --apple-id option');
      return prompt({
        name: 'appleId',
        message: 'Your Apple ID Username: ',
        type: 'input',
      });
    }
    return { appleId: this.options.appleId };
  }

  async uploadToStore({ name: appName, ios: { bundleIdentifier } }, { appleId }, path) {
    const fastlane = this.fastlane;
    const login = await spawnAndCollectJSONOutputAsync(fastlane.app_produce, [
      bundleIdentifier,
      appName,
      appleId,
    ]);
    if (login.result !== 'success') {
      printFastlaneError(login, 'login');
      return;
    }
    const upload = await spawnAndCollectJSONOutputAsync(fastlane.app_deliver, [path, appleId]);
    if (upload.result !== 'success') {
      printFastlaneError(upload, 'upload');
    }
  }
}
