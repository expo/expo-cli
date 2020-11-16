import { ExpoConfig } from '@expo/config';
import { UrlUtils } from '@expo/xdl';
import chalk from 'chalk';
import pick from 'lodash/pick';

import CommandError from '../../CommandError';
import { authenticate, requestAppleIdCreds } from '../../appleApi';
import { Context } from '../../credentials/context';
import log from '../../log';
import prompt, { Question } from '../../prompts';
import BaseUploader, { PlatformOptions } from './BaseUploader';
import { runFastlaneAsync } from './utils';

const PLATFORM = 'ios';

const APP_NAME_TOO_LONG_MSG = `An app name can't be longer than 30 characters.`;
const APP_NAME_QUESTION: Question = {
  type: 'text',
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
  companyName?: string;
};

type AppleCreds = Pick<IosPlatformOptions, 'appleId' | 'appleIdPassword'>;

interface AppleIdCredentials {
  appleId: string;
  appleIdPassword: string;
}

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
    if (!exp.ios?.bundleIdentifier) {
      throw new Error(`You must specify an iOS bundle identifier in app.json.`);
    }
  }

  async _getPlatformSpecificOptions(): Promise<{ [key: string]: any }> {
    const appleIdCredentials = await this._getAppleIdCredentials();
    const appleTeamId = await this._getAppleTeamId(appleIdCredentials);
    const appName = await this._getAppName();
    const otherOptions = pick(this.options, ['language', 'sku', 'companyName']);
    return {
      ...appleIdCredentials,
      appName,
      ...otherOptions,
      appleTeamId,
    };
  }

  async _getAppleTeamId(appleIdCredentials: AppleIdCredentials): Promise<string | undefined> {
    const ctx = new Context();
    await ctx.init(this.projectDir);
    let teamId;
    if (ctx.hasProjectContext && ctx.manifest?.ios?.bundleIdentifier) {
      const app = {
        accountName: ctx.manifest.owner ?? ctx.user.username,
        projectName: ctx.manifest.slug,
        bundleIdentifier: ctx.manifest?.ios?.bundleIdentifier,
      };
      const credentials = await ctx.ios.getAppCredentials(app);
      teamId = credentials?.credentials?.teamId;
    }

    if (teamId) {
      return teamId;
    } else {
      const { team } = await authenticate(appleIdCredentials);
      return team.id;
    }
  }

  async _getAppleIdCredentials(): Promise<AppleIdCredentials> {
    return await requestAppleIdCreds({
      appleId: this.options.appleId,
      appleIdPassword: this.options.appleIdPassword,
    });
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
    const { appleId, appleIdPassword, appName, language, appleTeamId, companyName } = platformData;

    const appleCreds = { appleId, appleIdPassword, appleTeamId, companyName };

    log('Resolving the ITC team ID...');
    const { itc_team_id: itcTeamId } = await runFastlaneAsync(
      fastlane.resolveItcTeamId,
      [],
      appleCreds
    );
    log(`ITC team ID is ${itcTeamId}`);
    const updatedAppleCreds = {
      ...appleCreds,
      itcTeamId,
    };

    log('Ensuring the app exists on App Store Connect, this may take a while...');
    try {
      await runFastlaneAsync(
        fastlane.appProduce,
        [this._exp?.ios?.bundleIdentifier, appName, appleId, language],
        updatedAppleCreds
      );
    } catch (err) {
      if (err.message.match(/You must provide a company name to use on the App Store/)) {
        log.error(
          'You haven\'t uploaded any app to App Store yet. Please provide your company name with --company-name "COMPANY NAME"'
        );
      }
      throw err;
    }

    log('Uploading the app to Testflight, hold tight...');
    await runFastlaneAsync(fastlane.pilotUpload, [buildPath, appleId], updatedAppleCreds);

    log(
      `All done! You may want to go to App Store Connect (${chalk.underline(
        'https://appstoreconnect.apple.com'
      )}) and share your build with your testers.`
    );
  }
}
