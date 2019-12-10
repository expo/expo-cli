import { Credentials, UrlUtils } from '@expo/xdl';
import { ExpoConfig } from '@expo/config';
import chalk from 'chalk';
import has from 'lodash/has';
import get from 'lodash/get';
import pick from 'lodash/pick';
import intersection from 'lodash/intersection';

import BaseUploader, { PlatformOptions } from './BaseUploader';
import log from '../../log';
import prompt, { Question } from '../../prompt';
import { runFastlaneAsync } from './utils';
import CommandError from '../../CommandError';
import { nonEmptyInput } from '../../validators';

const PLATFORM = 'ios';

const APPLE_CREDS_QUESTIONS: Question[] = [
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
const APP_NAME_QUESTION: Question = {
  type: 'input',
  name: 'appName',
  message: 'How would you like to name your app?',
  validate(appName: string): string | true {
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

export type IosPlatformOptions = PlatformOptions & {
  appleId?: string;
  appleIdPassword?: string;
  appName: string;
  language?: string;
  appleTeamId?: string;
  publicUrl?: string;
};

type AppleCreds = Pick<IosPlatformOptions, 'appleId' | 'appleIdPassword'>;

export default class IOSUploader extends BaseUploader {
  static validateOptions(options: IosPlatformOptions): void {
    if (options.language && !LANGUAGES.includes(options.language)) {
      throw new Error(
        `You must specify a supported language. Run expo upload:ios --help to see the list of supported languages.`
      );
    }
    if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
      throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
    }
  }

  constructor(projectDir: string, public options: IosPlatformOptions) {
    super(PLATFORM, projectDir, options);
  }

  _ensureExperienceIsValid(exp: ExpoConfig): void {
    if (!has(exp, 'ios.bundleIdentifier')) {
      throw new Error(`You must specify an iOS bundle identifier in app.json.`);
    }
  }

  async _getPlatformSpecificOptions(): Promise<{ [key: string]: any }> {
    const appleIdCrentials = await this._getAppleIdCredentials();
    const appleTeamId = await this._getAppleTeamId();
    const appName = await this._getAppName();
    const otherOptions = pick(this.options, ['language', 'sku']);
    return {
      ...appleIdCrentials,
      appName,
      ...otherOptions,
      appleTeamId,
    };
  }

  async _getAppleTeamId(): Promise<string | undefined> {
    const credentialMetadata = await Credentials.getCredentialMetadataAsync(this.projectDir, 'ios');
    const credential = await Credentials.getCredentialsForPlatform(credentialMetadata);
    return get(credential, 'teamId', undefined);
  }

  async _getAppleIdCredentials(): Promise<{ appleId: string; appleIdPassword: string }> {
    const appleCredsKeys = ['appleId', 'appleIdPassword'];
    const result: AppleCreds = pick(this.options, appleCredsKeys);

    if (process.env.EXPO_APPLE_ID) {
      result.appleId = process.env.EXPO_APPLE_ID;
    }
    if (process.env.EXPO_APPLE_ID_PASSWORD) {
      result.appleIdPassword = process.env.EXPO_APPLE_ID_PASSWORD;
    }

    const { appleId, appleIdPassword } = result;
    if (appleId && appleIdPassword) {
      return {
        appleId,
        appleIdPassword,
      };
    }
    const credsPresent = intersection(Object.keys(result), appleCredsKeys);

    const questions = APPLE_CREDS_QUESTIONS.filter(({ name }) => {
      return name && !credsPresent.includes(name);
    });
    const answers = await prompt(questions);
    return {
      appleId: appleId || answers.appleId,
      appleIdPassword: appleIdPassword || answers.appleIdPassword,
    };
  }

  async _getAppName(): Promise<string> {
    const appName = this.options.appName || (this._exp && this._exp.name);
    if (!appName || appName.length > 30) {
      if (appName && appName.length > 30) {
        log.error(APP_NAME_TOO_LONG_MSG);
      }
      return await this._askForAppName();
    } else {
      return appName;
    }
  }

  async _askForAppName(): Promise<string> {
    const { appName } = await prompt(APP_NAME_QUESTION);
    return appName;
  }

  async _uploadToTheStore(platformData: IosPlatformOptions, buildPath: string): Promise<void> {
    const { fastlane } = this;
    const { appleId, appleIdPassword, appName, language, appleTeamId } = platformData;
    const { bundleIdentifier } = this._exp && this._exp.ios;

    const appleCreds = { appleId, appleIdPassword, appleTeamId };

    log('Ensuring the app exists on App Store Connect, this may take a while...');
    await runFastlaneAsync(
      fastlane.appProduce,
      [bundleIdentifier, appName, appleId, language],
      appleCreds
    );

    log('Uploading the app to Testflight, hold tight...');
    await runFastlaneAsync(fastlane.pilotUpload, [buildPath, appleId], appleCreds);

    log(
      `All done! You may want to go to App Store Connect (${chalk.underline(
        'https://appstoreconnect.apple.com'
      )}) and share your build with your testers.`
    );
  }
}
