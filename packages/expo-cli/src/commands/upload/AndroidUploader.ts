import has from 'lodash/has';
import fs from 'fs-extra';

import { ExpoConfig } from '@expo/config';
import BaseUploader, { PlatformOptions } from './BaseUploader';
import { runFastlaneAsync } from './utils';
import prompt, { Question } from '../../prompt';
import log from '../../log';

const PLATFORM = 'android';

const FILE_DOESNT_EXIST_ERROR = (path: string): string => `File ${path} doesn't exist.`;

const SERVICE_ACCOUNT_JSON_QUESTION: Question = {
  name: 'key',
  message:
    'The path to the file containing service account JSON, used to authenticate with Google:',
  type: 'input',
  async validate(path: string): Promise<boolean | string> {
    const exists = await fs.pathExists(path.trim());

    if (exists) {
      return true;
    } else {
      return FILE_DOESNT_EXIST_ERROR(path);
    }
  },
};

export type AndroidPlatformOptions = PlatformOptions & {
  track: string;
  key: string;
  releaseStatus?: 'completed' | 'draft' | 'halted' | 'inProgress';
};

export default class AndroidUploader extends BaseUploader {
  constructor(projectDir: string, public options: AndroidPlatformOptions) {
    super(PLATFORM, projectDir, options);
  }

  _ensureExperienceIsValid(exp: ExpoConfig) {
    if (!has(exp, 'android.package')) {
      throw new Error('You must specify an Android package in app.json.');
    }
  }

  async _getPlatformSpecificOptions(): Promise<AndroidPlatformOptions> {
    const key = await this._getServiceAccountJSONPath();
    return { key, track: this.options.track, releaseStatus: this.options.releaseStatus };
  }

  async _getServiceAccountJSONPath() {
    const { key } = this.options;
    if (key && (await fs.pathExists(key))) {
      return key;
    } else {
      if (key) {
        log(FILE_DOESNT_EXIST_ERROR(key));
      }
      return await this._askForServiceAccountJSONPath();
    }
  }

  async _askForServiceAccountJSONPath() {
    const answer = await prompt(SERVICE_ACCOUNT_JSON_QUESTION);
    return answer.key;
  }

  async _uploadToTheStore(platformData: AndroidPlatformOptions, path: string): Promise<void> {
    const { fastlane } = this;
    const { key, track, releaseStatus } = platformData;
    if (!this._exp) throw new Error('Expo Config is not defined');

    const args = [path, this._exp.android?.package, key, track];
    if (releaseStatus) {
      args.push(releaseStatus);
    }
    await runFastlaneAsync(fastlane.supplyAndroid, args, {});
  }
}
