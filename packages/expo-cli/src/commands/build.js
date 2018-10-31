/**
 * @flow
 */

import { UrlUtils } from 'xdl';
import BaseBuilder from './build/BaseBuilder';
import IOSBuilder from './build/IOSBuilder';
import AndroidBuilder from './build/AndroidBuilder';
import BuildError from './build/BuildError';
import log from '../log';
import CommandError from '../CommandError';

export default (program: any) => {
  program
    .command('build:ios [project-dir]')
    .alias('bi')
    .option('-c, --clear-credentials', 'Clear credentials stored on expo servers')
    .option(
      '--clear-app-credentials',
      'Remove app related credentials stored on expo servers (iOS)'
    )
    .option('--clear-dist-cert', 'Remove distribution cert stored on expo servers (iOS)')
    .option('-e, --apple-enterprise-account', 'Run as Apple Enterprise account')
    .option(
      '--apple-id <login>',
      'Apple ID username (please also set the Apple ID password as EXPO_APPLE_PASSWORD environment variable)'
    )
    .option(
      '--revoke-apple-dist-certs',
      'Revoke distribution certs on developer.apple.com before attempting to make new certs, must use with -c'
    )
    .option(
      '--revoke-apple-push-certs',
      'Revoke push certs on developer.apple.com before attempting to make new certs, must use with -c'
    )
    .option(
      '--revoke-apple-provisioning-profile',
      'Revoke provisioning profile on developer.apple.com, must use with -c'
    )
    .option('-t --type <build>', 'Type of build: [archive|simulator].', /^(archive|simulator)$/i)
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--no-publish', 'Disable automatic publishing before building.')
    .option('--no-wait', 'Exit immediately after triggering build.')
    .option('--team-id <apple-teamId>', 'Apple Team ID.')
    .option('--dist-p12-path <dist.p12>', 'Path to your Distribution Certificate P12.')
    .option('--push-p12-path <push.p12>', 'Path to your Push Notification Certificate P12.')
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
      return iosBuilder.command(options);
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
      return androidBuilder.command(options);
    });

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
      try {
        return await builder.checkStatus({
          platform: 'all',
          current: false,
          ...(options.publicUrl ? { publicUrl: options.publicUrl } : {}),
        });
      } catch (e) {
        if (e instanceof BuildError) {
          return;
        }
        throw e;
      }
    }, /* skipProjectValidation: */ true);
};
