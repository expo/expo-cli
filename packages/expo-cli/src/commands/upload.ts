import chalk from 'chalk';
import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('upload:android [path]')
      .alias('ua')
      .description('Upload an Android binary to the Google Play Store')
      .helpGroup('upload')
      .option('--verbose', `Migrate to ${chalk.bold`eas submit --verbose`}`)
      .option('--latest', `Migrate to ${chalk.bold`eas submit --latest`}`)
      .option('--id <id>', `Migrate to ${chalk.bold`eas submit --id <id>`}`)
      .option('--path [path]', `Migrate to ${chalk.bold`eas submit --path <path>`}`)
      .option('--url <url>', `Migrate to ${chalk.bold`eas submit --url <url>`}`)
      .option(
        '--android-package <android-package>',
        `Migrate to ${chalk.bold`eas submit`} (android-package is auto inferred)`
      )
      .option(
        '--type <archive-type>',
        `Migrate to ${chalk.bold`eas submit`} (type is auto inferred)`
      )
      .option(
        '--key <key>',
        `Migrate to ${chalk.bold`eas.json`}'s ${chalk.bold`serviceAccountKeyPath`} property`
      )
      .option(
        '--track <track>',
        `Migrate to ${chalk.bold`eas.json`}'s ${chalk.bold`track`} property`
      )
      .option(
        '--release-status <release-status>',
        `Migrate to ${chalk.bold`eas.json`}'s ${chalk.bold`releaseStatus`} property`
      ),
    () => import('./upload/uploadAndroidAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('upload:ios [path]')
      .alias('ui')
      .description(
        `${chalk.yellow('Unsupported:')} Use ${chalk.bold(
          'eas submit'
        )} or Transporter app instead.`
      )
      .longDescription(
        'Upload an iOS binary to Apple TestFlight (MacOS only). Uses the latest build by default'
      )
      .helpGroup('upload')
      // TODO: Remove all props now that this is deprecated
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
      .option(
        '--public-url <url>',
        'The URL of an externally hosted manifest (for self-hosted apps)'
      ),
    () => import('./upload/uploadIosAsync')
  );
}
