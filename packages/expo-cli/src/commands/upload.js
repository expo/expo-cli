import _ from 'lodash';

import IOSUploader, { LANGUAGES } from './upload/IOSUploader';
import AndroidUploader from './upload/AndroidUploader';
import log from '../log';

const COMMON_OPTIONS = ['id', 'latest', 'path'];

export default program => {
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
    .asyncActionProjectDir(createUploadAction(AndroidUploader, ANDROID_OPTIONS));

  const IOS_OPTIONS = [
    ...COMMON_OPTIONS,
    'appleId',
    'appleIdPassword',
    'appName',
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
    .option(
      '--apple-id-password <apple-id-password>',
      'your Apple ID password (you can also set EXPO_APPLE_ID_PASSWORD env variable)'
    )
    .option(
      '--app-name <app-name>',
      `the name of your app as it will appear on the App Store, this can't be longer than 30 characters (default: expo.name from app.json)`
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
    .on('--help', function() {
      console.log('Available languages:');
      console.log(`  ${LANGUAGES.join(', ')}`);
      console.log();
    })
    .asyncActionProjectDir(createUploadAction(IOSUploader, IOS_OPTIONS));
};

function setCommonOptions(command, fileExtension) {
  command
    .option('--latest', 'uploads the latest build (default)')
    .option('--id <id>', 'id of the build to upload')
    .option('--path <path>', `path to the ${fileExtension} file`);
}

function createUploadAction(UploaderClass, optionKeys) {
  return async (projectDir, command) => {
    try {
      ensurePlatformIsSupported();
      await ensureOptionsAreValid(command);

      const options = _.pick(command, optionKeys);
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

function ensurePlatformIsSupported() {
  if (process.platform !== 'darwin') {
    log.error('Unsupported platform! This feature works on macOS only.');
    process.exit(1);
  }
}

async function ensureOptionsAreValid(command) {
  const args = _.pick(command, COMMON_OPTIONS);
  if (_.size(args) > 1) {
    throw new Error(`You have to choose only one of --path, --id or --latest parameters`);
  }
}
