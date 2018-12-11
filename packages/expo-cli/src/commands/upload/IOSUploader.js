import _ from 'lodash';
import chalk from 'chalk';

import { Credentials, Exp, UrlUtils } from 'xdl';
import BaseUploader from './BaseUploader';
import log from '../../log';
import prompt from '../../prompt';
import { runFastlaneAsync } from './utils';
import CommandError from '../../CommandError';
import { nonEmptyInput } from '../utils/validators';

const PLATFORM = 'ios';

const APPLE_CREDS_QUESTIONS = [
  {
    type: 'input',
    name: 'appleId',
    message: `What's your Apple ID?`,
    validate: nonEmptyInput,
  },
  {
    type: 'password',
    name: 'appleIdPassword',
    message: 'Password?',
    validate: nonEmptyInput,
  },
];

const APP_NAME_TOO_LONG_MSG = `An app name can't be longer than 30 characters.`;
const APP_NAME_QUESTION = {
  type: 'input',
  name: 'appName',
  message: 'How would you like to name your app?',
  validate: appName => {
    if (!appName) {
      return 'Empty app name is not valid.';
    } else if (appName.length > 30) {
      return APP_NAME_TOO_LONG_MSG;
    } else {
      return true;
    }
  },
};

export const LANGUAGES = [
  'Brazilian Portuguese',
  'Danish',
  'Dutch',
  'English',
  'English_Australian',
  'English_CA',
  'English_UK',
  'Finnish',
  'French',
  'French_CA',
  'German',
  'Greek',
  'Indonesian',
  'Italian',
  'Japanese',
  'Korean',
  'Malay',
  'Norwegian',
  'Portuguese',
  'Russian',
  'Simplified Chinese',
  'Spanish',
  'Spanish_MX',
  'Swedish',
  'Thai',
  'Traditional Chinese',
  'Turkish',
  'Vietnamese',
];

export default class IOSUploader extends BaseUploader {
  static validateOptions(options) {
    if (!LANGUAGES.includes(options.language)) {
      throw new Error(
        `You must specify a supported language. Run expo upload:ios --help to see the list of supported languages.`
      );
    }
    if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
      throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
    }
  }

  constructor(projectDir, options) {
    super(PLATFORM, projectDir, options);
  }

  _ensureExperienceIsValid(exp) {
    if (!_.has(exp, 'ios.bundleIdentifier')) {
      throw new Error(`You must specify an iOS bundle identifier in app.json.`);
    }
  }

  async _getPlatformSpecificOptions() {
    const appleIdCrentials = await this._getAppleIdCredentials();
    const appleTeamId = await this._getAppleTeamId();
    const appName = await this._getAppName();
    const otherOptions = _.pick(this.options, ['language', 'sku']);
    return {
      ...appleIdCrentials,
      appName,
      ...otherOptions,
      appleTeamId,
    };
  }

  async _getAppleTeamId() {
    const publicUrl = this.options.publicUrl;
    const {
      args: {
        username,
        remoteFullPackageName: experienceName,
        bundleIdentifierIOS: bundleIdentifier,
      },
    } = publicUrl
      ? await Exp.getThirdPartyInfoAsync(publicUrl)
      : await Exp.getPublishInfoAsync(this.projectDir);

    const { teamId } = await Credentials.getCredentialsForPlatform({
      username,
      experienceName,
      bundleIdentifier,
      platform: 'ios',
    });

    return teamId;
  }

  async _getAppleIdCredentials() {
    const appleCredsKeys = ['appleId', 'appleIdPassword'];
    const result = _.pick(this.options, appleCredsKeys);

    if (process.env.EXPO_APPLE_ID) {
      result.appleId = process.env.EXPO_APPLE_ID;
    }
    if (process.env.EXPO_APPLE_ID_PASSWORD) {
      result.appleIdPassword = process.env.EXPO_APPLE_ID_PASSWORD;
    }

    const credsPresent = _.intersection(Object.keys(result), appleCredsKeys);
    if (credsPresent.length !== appleCredsKeys.length) {
      const questions = APPLE_CREDS_QUESTIONS.filter(({ name }) => !credsPresent.includes(name));
      const answers = await prompt(questions);
      return { ...result, ...answers };
    } else {
      return result;
    }
  }

  async _getAppName() {
    const appName = this.options.appName || this._exp.name;
    if (!appName || appName.length > 30) {
      if (appName && appName.length > 30) {
        log.error(APP_NAME_TOO_LONG_MSG);
      }
      return await this._askForAppName();
    } else {
      return appName;
    }
  }

  async _askForAppName() {
    const { appName } = await prompt(APP_NAME_QUESTION);
    return appName;
  }

  async _uploadToTheStore(platformData, buildPath) {
    const { fastlane } = this;
    const { appleId, appleIdPassword, appName, language, appleTeamId } = platformData;
    const { bundleIdentifier } = this._exp.ios;

    const appleCreds = { appleId, appleIdPassword, appleTeamId };

    log('Ensuring the app exists on App Store Connect, this may take a while...');
    await runFastlaneAsync(
      fastlane.appProduce,
      [bundleIdentifier, appName, appleId, language],
      appleCreds
    );

    log('Uploading the app to Testflight, hold tight...');
    await runFastlaneAsync(fastlane.pilotUpload, [buildPath, appleId], appleCreds, true);

    log(
      `All done! You may want to go to App Store Connect (${chalk.underline(
        'https://appstoreconnect.apple.com'
      )}) and share your build with your testers.`
    );
  }
}
