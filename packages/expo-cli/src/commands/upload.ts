import pick from 'lodash/pick';
import size from 'lodash/size';
import { Command } from 'commander';

import IOSUploader, { IosPlatformOptions, LANGUAGES } from './upload/IOSUploader';
import AndroidUploader, { AndroidPlatformOptions } from './upload/AndroidUploader';
import log from '../log';

const COMMON_OPTIONS = ['id', 'latest', 'path'];

export default function (program: Command) {
  const ANDROID_OPTIONS = [...COMMON_OPTIONS, 'key', 'track'];
  const androidCommand = program.command('upload:android [projectDir]').alias('ua');
  setCommonOptions(androidCommand, '.apk');
  androidCommand
    .option('--key <key>', 'path to the JSON key used to authenticate with Google Play')
    .option(
      '--track <track>',
      'the track of the application to use, choose from: production, beta, alpha, internal, rollout',
      /^(production|beta|alpha|internal|rollout)$/i,
      'internal'
    )
    .description(
      'Uploads a standalone Android app to Google Play (works on macOS only). Uploads the latest build by default.'
    )
    .asyncActionProjectDir(createUploadAction(AndroidUploader, ANDROID_OPTIONS), {
      checkConfig: true,
    });

  const IOS_OPTIONS = [
    ...COMMON_OPTIONS,
    'appleId',
    'appleIdPassword',
    'appName',
    'companyName',
    'sku',
    'language',
    'publicUrl',
  ];
  const iosCommand = program.command('upload:ios [projectDir]').alias('ui');
  setCommonOptions(iosCommand, '.ipa');
  iosCommand
    .option(
      '--apple-id <apple-id>',
      'your Apple ID username (you can also set EXPO_APPLE_ID env variable)'
    )
    // apple unified App Store Connect and Developer Portal teams, this is temporary solution until fastlane implements those changes
    // https://github.com/fastlane/fastlane/issues/14229
    // after updating fastlane this value will be unnecessary
    .option(
      '--itc-team-id <itc-team-id>',
      'App Store Connect Team ID - this option is deprecated, the proper ID is resolved automatically'
    )
    .option(
      '--apple-id-password <apple-id-password>',
      'your Apple ID password (you can also set EXPO_APPLE_ID_PASSWORD env variable)'
    )
    .option(
      '--app-name <app-name>',
      `the name of your app as it will appear on the App Store, this can't be longer than 30 characters (default: expo.name from app.json)`
    )
    .option(
      '--company-name <company-name>',
      'the name of your company, needed only for the first upload of any app to App Store'
    )
    .option(
      '--sku <sku>',
      'a unique ID for your app that is not visible on the App Store, will be generated unless provided'
    )
    .option(
      '--language <language>',
      `primary language (e.g. English, German; run \`expo upload:ios --help\` to see the list of available languages)`,
      'English'
    )
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .description(
      'Uploads a standalone app to Apple TestFlight (works on macOS only). Uploads the latest build by default.'
    )
    .on('--help', function () {
      console.log('Available languages:');
      console.log(`  ${LANGUAGES.join(', ')}`);
      console.log();
    })
    .asyncActionProjectDir(createUploadAction(IOSUploader, IOS_OPTIONS), { checkConfig: true });
}

function setCommonOptions(command: Command, fileExtension: string) {
  command
    .option('--latest', 'uploads the latest build (default)')
    .option('--id <id>', 'id of the build to upload')
    .option('--path <path>', `path to the ${fileExtension} file`);
}

type AnyUploader = any;

function createUploadAction(UploaderClass: AnyUploader, optionKeys: string[]) {
  return async (
    projectDir: string,
    command: AndroidPlatformOptions | IosPlatformOptions
  ): Promise<void> => {
    try {
      ensurePlatformIsSupported();
      ensureOptionsAreValid(command);

      const options = pick(command, optionKeys);
      if (UploaderClass.validateOptions) {
        UploaderClass.validateOptions(options);
      }
      const uploader = new UploaderClass(projectDir, options);
      await uploader.upload();
    } catch (err) {
      log.error('Failed to upload the standalone app to the app store.');
      throw err;
    }
  };
}

function ensurePlatformIsSupported(): void {
  if (process.platform !== 'darwin') {
    log.error('Unsupported platform! This feature works on macOS only.');
    process.exit(1);
  }
}

function ensureOptionsAreValid(command: AndroidPlatformOptions | IosPlatformOptions): void {
  const args = pick(command, COMMON_OPTIONS);
  if (size(args) > 1) {
    throw new Error(`You have to choose only one of --path, --id or --latest parameters`);
  }
}
