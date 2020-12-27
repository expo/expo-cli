import chalk from 'chalk';
import { Command } from 'commander';

import log from '../log';
import AndroidSubmitCommand from './upload/submission-service/android/AndroidSubmitCommand';
import { AndroidSubmitCommandOptions } from './upload/submission-service/android/types';
import * as TerminalLink from './utils/TerminalLink';

export default function (program: Command) {
  program
    .command('upload:android [path]')
    .alias('ua')
    .description('Upload an Android binary to the Google Play Store')
    .helpGroup('upload')
    .option('--latest', 'upload the latest build')
    .option('--id <id>', 'id of the build to upload')
    .option('--path [path]', 'path to the .apk/.aab file')
    .option('--url <url>', 'app archive url')
    .option('--key <key>', 'path to the JSON key used to authenticate with Google Play')
    .option(
      '--android-package <android-package>',
      'Android package name (using expo.android.package from app.json by default)'
    )
    .option('--type <archive-type>', 'archive type: apk, aab', /^(apk|aab)$/i)
    .option(
      '--track <track>',
      'the track of the application to use, choose from: production, beta, alpha, internal, rollout',
      /^(production|beta|alpha|internal|rollout)$/i,
      'internal'
    )
    .option(
      '--release-status <release-status>',
      'release status (used when uploading new apks/aabs), choose from: completed, draft, halted, inProgress',
      /^(completed|draft|halted|inProgress)$/i,
      'completed'
    )
    .option(
      '--use-submission-service',
      'Experimental: Use Submission Service for uploading your app. The upload process will happen on Expo servers.'
    )
    .option('--verbose', 'Always print logs from Submission Service')
    // TODO: make this work outside the project directory (if someone passes all necessary options for upload)
    .asyncActionProjectDir(async (projectDir: string, options: AndroidSubmitCommandOptions) => {
      if (options.useSubmissionService) {
        log.warn(
          '\n`--use-submission-service is now the default and the flag will be deprecated in the future.`'
        );
      }
      const ctx = AndroidSubmitCommand.createContext(projectDir, options);
      const command = new AndroidSubmitCommand(ctx);
      await command.runAsync();
    });

  program
    .command('upload:ios [path]')
    .alias('ui')
    .description(
      `${chalk.yellow('Unsupported:')} Use ${chalk.bold('eas submit')} or Transporter app instead.`
    )
    .longDescription(
      'Upload an iOS binary to Apple TestFlight (MacOS only). Uses the latest build by default'
    )
    .helpGroup('upload')
    .option('--latest', 'upload the latest build (default)')
    .option('--id <id>', 'id of the build to upload')
    .option('--path [path]', 'path to the .ipa file')
    .option('--url <url>', 'app archive url')
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
      'your Apple ID password (you can also set EXPO_APPLE_PASSWORD env variable)'
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
    // TODO: make this work outside the project directory (if someone passes all necessary options for upload)
    .asyncActionProjectDir(async (projectDir: string, options: any) => {
      const logItem = (name: string, link: string) => {
        log(`\u203A ${TerminalLink.linkedText(name, link)}`);
      };

      log.newLine();
      log(chalk.yellow('expo upload:ios is no longer supported'));
      log('Please use one of the following');
      log.newLine();
      logItem(chalk.cyan.bold('eas submit'), 'https://docs.expo.io/submit/ios');
      logItem('Transporter', 'https://apps.apple.com/us/app/transporter/id1450874784');
      logItem(
        'Fastlane deliver',
        'https://docs.fastlane.tools/getting-started/ios/appstore-deployment'
      );
      log.newLine();
    });
}
