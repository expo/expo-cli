import _ from 'lodash';
import fs from 'fs-extra';

import BaseUploader from './BaseUploader';
import { runFastlaneAsync } from './utils';
import prompt from '../../prompt';
import log from '../../log';

const PLATFORM = 'android';

const FILE_DOESNT_EXIST_ERROR = path => `File ${path} doesn't exist.`;

const SERVICE_ACCOUNT_JSON_QUESTION = {
  name: 'key',
  message:
    'The path to the file containing service account JSON, used to authenticate with Google:',
  type: 'input',
  validate: function validate(path) {
    const done = this.async();
    fs.pathExists(path)
      .then(exists => {
        if (exists) {
          done(null, true);
        } else {
          done(FILE_DOESNT_EXIST_ERROR(path));
        }
      })
      .catch(err => done(err));
  },
};

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
    const key = await this._getServiceAccountJSONPath();
    return { key, track: this.options.track };
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

  async _uploadToTheStore(platformData, path) {
    const { fastlane } = this;
    const { key, track } = platformData;
    const { package: androidPackage } = this._exp.android;
    await runFastlaneAsync(fastlane.supplyAndroid, [path, androidPackage, key, track], {}, true);
  }
}
