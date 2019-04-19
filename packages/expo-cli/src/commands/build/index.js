/**
 * @flow
 */

import { UrlUtils, Webpack } from 'xdl';
import BaseBuilder from './BaseBuilder';
import IOSBuilder from './ios/IOSBuilder';
import AndroidBuilder from './AndroidBuilder';
import log from '../../log';
import CommandError from '../../CommandError';

export default (program: any) => {
  program
    .command('build:ios [project-dir]')
    .alias('bi')
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
    .option(
      '-t --type <build>',
      'Type of build: [archive|simulator].',
      /^(archive|simulator)$/i,
      'archive'
    )
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--no-publish', 'Disable automatic publishing before building.')
    .option('--no-wait', 'Exit immediately after scheduling build.')
    .option('--team-id <apple-teamId>', 'Apple Team ID.')
    .option(
      '--dist-p12-path <dist.p12>',
      'Path to your Distribution Certificate P12 (set password as EXPO_IOS_DIST_P12_PASSWORD environment variable).'
    )
    .option('--push-id <push-id>', 'Push Key ID (ex: 123AB4C56D).')
    .option('--push-p8-path <push.p12>', 'Path to your Push Key .p8 file.')
    .option('--provisioning-profile-path <.mobileprovision>', 'Path to your Provisioning Profile.')
    .option(
      '--public-url <url>',
      'The URL of an externally hosted manifest (for self-hosted apps).'
    )
    .description(
      'Build a standalone IPA for your project, signed and ready for submission to the Apple App Store.'
    )
    .asyncActionProjectDir((projectDir, options) => {
      if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
        throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
      }
      let channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
      if (!channelRe.test(options.releaseChannel)) {
        log.error(
          'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
        );
        process.exit(1);
      }
      if (
        options.type !== undefined &&
        options.type !== 'archive' &&
        options.type !== 'simulator'
      ) {
        log.error('Build type must be one of {archive, simulator}');
        process.exit(1);
      }
      const iosBuilder = new IOSBuilder(projectDir, options);
      return iosBuilder.command();
    });

  program
    .command('build:android [project-dir]')
    .alias('ba')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--no-publish', 'Disable automatic publishing before building.')
    .option('--no-wait', 'Exit immediately after triggering build.')
    .option('--keystore-path <app.jks>', 'Path to your Keystore.')
    .option('--keystore-alias <alias>', 'Keystore Alias')
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .description(
      'Build a standalone APK for your project, signed and ready for submission to the Google Play Store.'
    )
    .asyncActionProjectDir((projectDir, options) => {
      if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
        throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
      }
      let channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
      if (!channelRe.test(options.releaseChannel)) {
        log.error(
          'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
        );
        process.exit(1);
      }
      const androidBuilder = new AndroidBuilder(projectDir, options);
      return androidBuilder.command();
    });

  program
    .command('build:web [project-dir]')
    .option('--no-polyfill', 'Prevent webpack from including @babel/polyfill')
    .option('-d, --dev', 'Bundle your project using webpack in dev mode.')
    .option(
      '--stats <path>',
      'Output path for webpack stats. Defaults to "web-build-stats.json"',
      'web-build-stats.json'
    )
    .description('Build a production bundle for your project, compressed and ready for deployment.')
    .asyncActionProjectDir(
      (projectDir, options) => Webpack.bundleAsync(projectDir, options),
      /* skipProjectValidation: */ false,
      /* skipAuthCheck: */ true
    );

  program
    .command('build:status [project-dir]')
    .alias('bs')
    .option(
      '--public-url <url>',
      'The URL of an externally hosted manifest (for self-hosted apps).'
    )
    .description(`Gets the status of a current (or most recently finished) build for your project.`)
    .asyncActionProjectDir(async (projectDir, options) => {
      if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
        throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
      }
      const builder = new BaseBuilder(projectDir, options);
      return builder.commandCheckStatus();
    }, /* skipProjectValidation: */ true);
};
