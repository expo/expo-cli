import pick from 'lodash/pick';
import size from 'lodash/size';

import IOSUploader, { LANGUAGES } from './upload/IOSUploader';
import AndroidUploader from './upload/AndroidUploader';
import log from '../log';

const COMMON_OPTIONS = ['id', 'latest', 'path'];

export default program => {
  const ANDROID_OPTIONS = [...COMMON_OPTIONS, 'key', 'track'];
  const androidCommand = program.command('upload:android [projectDir]').alias('ua');
  setCommonOptions(androidCommand, '.apk');
  androidCommand
    .option('--key [key]', 'Path to the JSON key used to authenticate with Google Play.')
    .option(
      '--track [track]',
      'The track of the application to use. Options: production, beta, alpha, internal, rollout.',
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
    'itcTeamId',
    'appName',
    'sku',
    'language',
    'publicUrl',
  ];
  const iosCommand = program.command('upload:ios [projectDir]').alias('ui');
  setCommonOptions(iosCommand, '.ipa');
  iosCommand
    .option(
      '--apple-id [id]',
      'Apple ID username. You can also set your username as `EXPO_APPLE_ID` env variable.'
    )
    // apple unified App Store Connect and Developer Portal teams, this is temporary solution until fastlane implements those changes
    // https://github.com/fastlane/fastlane/issues/14229
    // after updating fastlane this value will be unnecessary
    .option(
      '--itc-team-id [id]',
      'App Store Connect Team ID (optional if there is only one team available).'
    )
    .option(
      '--apple-id-password [password]',
      'Apple ID password. You can also set your password as `EXPO_APPLE_ID_PASSWORD` env variable.'
    )
    .option(
      '--app-name [name]',
      `The name of your app as it will appear on the App Store. Max character limit: 30. Default: expo.name from app.json.`
    )
    .option(
      '--sku <sku>',
      'A unique ID for your app that is not visible on the App Store which will be generated unless provided.'
    )
    .option(
      '--language <language>',
      `Sets the primary language. Run \`expo upload:ios --help\` to see the list of available languages.`,
      'English'
    )
    .option('--public-url [url]', 'The url of an externally hosted manifest for self-host apps.')
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
    .option('--latest', 'Uploads the latest build. This is the default behavior.')
    .option('--id [id]', 'Id of the build to upload.')
    .option('--path [path]', `Path to the ${fileExtension} file.`);
}

function createUploadAction(UploaderClass, optionKeys) {
  return async (projectDir, command) => {
    try {
      ensurePlatformIsSupported();
      await ensureOptionsAreValid(command);

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

function ensurePlatformIsSupported() {
  if (process.platform !== 'darwin') {
    log.error('Unsupported platform! This feature works on macOS only.');
    process.exit(1);
  }
}

async function ensureOptionsAreValid(command) {
  const args = pick(command, COMMON_OPTIONS);
  if (size(args) > 1) {
    throw new Error(`You have to choose only one of --path, --id or --latest parameters`);
  }
}
