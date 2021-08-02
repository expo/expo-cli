import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('build:ios [path]')
      .alias('bi')
      .helpGroup('build')
      .option('-c, --clear-credentials', 'Clear all credentials stored on Expo servers.')
      .option('--clear-dist-cert', 'Remove Distribution Certificate stored on Expo servers.')
      .option('--clear-push-key', 'Remove Push Notifications Key stored on Expo servers.')
      .option(
        '--clear-push-cert',
        'Remove Push Notifications Certificate stored on Expo servers. Use of Push Notifications Certificates is deprecated.'
      )
      .option('--clear-provisioning-profile', 'Remove Provisioning Profile stored on Expo servers.')
      .option(
        '-r --revoke-credentials',
        'Revoke credentials on developer.apple.com, select appropriate using --clear-* options.'
      )
      .option(
        '--apple-id <login>',
        'Apple ID username (please also set the Apple ID password as EXPO_APPLE_PASSWORD environment variable).'
      )
      .option('-t --type <archive|simulator>', 'Type of build: [archive|simulator].')
      .option('--release-channel <name>', 'Pull from specified release channel.', 'default')
      .option('--no-publish', 'Disable automatic publishing before building.')
      .option('--no-wait', 'Exit immediately after scheduling build.')
      .option('--team-id <apple-teamId>', 'Apple Team ID.')
      .option(
        '--dist-p12-path <path>',
        'Path to your Distribution Certificate P12 (set password as EXPO_IOS_DIST_P12_PASSWORD environment variable).'
      )
      .option('--push-id <push-id>', 'Push Key ID (ex: 123AB4C56D).')
      .option('--push-p8-path <path>', 'Path to your Push Key .p8 file.')
      .option('--provisioning-profile-path <path>', 'Path to your Provisioning Profile.')
      .option(
        '--public-url <url>',
        'The URL of an externally hosted manifest (for self-hosted apps).'
      )
      .option('--skip-credentials-check', 'Skip checking credentials.')
      .option(
        '--skip-workflow-check',
        'Skip warning about build service bare workflow limitations.'
      )
      .description('Build and sign a standalone IPA for the Apple App Store'),
    () => import('./buildIosAsync'),
    { checkConfig: true }
  );

  applyAsyncActionProjectDir(
    program
      .command('build:android [path]')
      .alias('ba')
      .helpGroup('build')
      .option('-c, --clear-credentials', 'Clear stored credentials.')
      .option('--release-channel <name>', 'Pull from specified release channel.', 'default')
      .option('--no-publish', 'Disable automatic publishing before building.')
      .option('--no-wait', 'Exit immediately after triggering build.')
      .option('--keystore-path <path>', 'Path to your Keystore: *.jks.')
      .option('--keystore-alias <alias>', 'Keystore Alias')
      .option('--generate-keystore', '[deprecated] Generate Keystore if one does not exist')
      .option(
        '--public-url <url>',
        'The URL of an externally hosted manifest (for self-hosted apps)'
      )
      .option(
        '--skip-workflow-check',
        'Skip warning about build service bare workflow limitations.'
      )
      .option('-t --type <app-bundle|apk>', 'Type of build: [app-bundle|apk].')
      .description('Build and sign a standalone APK or App Bundle for the Google Play Store'),
    () => import('./buildAndroidAsync'),
    { checkConfig: true }
  );

  applyAsyncActionProjectDir(
    program
      .command('build:web [path]')
      .helpGroup('build')
      .option('-c, --clear', 'Clear all cached build files and assets.')
      .option(
        '--no-pwa',
        'Prevent webpack from generating the manifest.json and injecting meta into the index.html head.'
      )
      .option('-d, --dev', 'Turns dev flag on before bundling')
      .description('Build the web app for production'),
    () => import('./buildWebAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('build:status [path]')
      .alias('bs')
      .helpGroup('build')
      .option(
        '--public-url <url>',
        'The URL of an externally hosted manifest (for self-hosted apps).'
      )
      .description(`Get the status of the latest build for the project`),
    () => import('./buildStatusAsync')
  );
}
