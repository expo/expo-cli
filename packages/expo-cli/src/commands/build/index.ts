import { UrlUtils, Webpack } from '@expo/xdl';
import { Command } from 'commander';
import chalk from 'chalk';
import BaseBuilder from './BaseBuilder';
import IOSBuilder from './ios/IOSBuilder';
import AndroidBuilder from './AndroidBuilder';
import log from '../../log';
import CommandError from '../../CommandError';
import * as ProjectUtils from '../utils/ProjectUtils';
import { askBuildType } from './utils';
import prompt from '../../prompt';

import { AndroidOptions, IosOptions } from './BaseBuilder.types';

async function maybeBailOnWorkflowWarning(projectDir: string, platform: 'ios' | 'android') {
  const { workflow } = await ProjectUtils.findProjectRootAsync(projectDir);
  if (workflow === 'managed') {
    return false;
  }

  const command = `expo build:${platform}`;
  log.warn(chalk.bold(`⚠️  ${command} currently only supports managed workflow apps.`));
  log.warn(
    `If you proceed with this command, we can run the build for you but it will not include any custom native modules or changes that you have made to your local native projects.`
  );
  log.warn(
    `Unless you are sure that you know what you are doing, we recommend aborting the build and doing a native release build through ${
      platform === 'ios' ? 'Xcode' : 'Android Studio'
    }.`
  );

  const answer = await prompt({
    type: 'confirm',
    name: 'ignoreWorkflowWarning',
    message: `Would you like to proceed?`,
  });

  return !answer.ignoreWorkflowWarning;
}

export default function (program: Command) {
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
    .option('-t --type <build>', 'Type of build: [archive|simulator].')
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--no-publish', 'Disable automatic publishing before building.')
    .option('--no-wait', 'Exit immediately after scheduling build.')
    .option('--team-id <apple-teamId>', 'Apple Team ID.')
    .option(
      '--dist-p12-path <dist.p12>',
      'Path to your Distribution Certificate P12 (set password as EXPO_IOS_DIST_P12_PASSWORD environment variable).'
    )
    .option('--push-id <push-id>', 'Push Key ID (ex: 123AB4C56D).')
    .option('--push-p8-path <push.p8>', 'Path to your Push Key .p8 file.')
    .option('--provisioning-profile-path <.mobileprovision>', 'Path to your Provisioning Profile.')
    .option(
      '--public-url <url>',
      'The URL of an externally hosted manifest (for self-hosted apps).'
    )
    .option('--skip-credentials-check', 'Skip checking credentials.')
    .option('--skip-workflow-check', 'Skip warning about build service bare workflow limitations.')
    .description(
      'Build a standalone IPA for your project, signed and ready for submission to the Apple App Store.'
    )
    .asyncActionProjectDir(
      async (projectDir: string, options: IosOptions) => {
        if (!options.skipWorkflowCheck) {
          if (await maybeBailOnWorkflowWarning(projectDir, 'ios')) {
            return;
          }
        }

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
        options.type = await askBuildType(options.type, {
          archive: 'Deploy the build to the store',
          simulator: 'Run the build on a simulator',
        });
        const iosBuilder = new IOSBuilder(projectDir, options);
        return iosBuilder.command();
      },
      { checkConfig: true }
    );

  program
    .command('build:android [project-dir]')
    .alias('ba')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--no-publish', 'Disable automatic publishing before building.')
    .option('--no-wait', 'Exit immediately after triggering build.')
    .option('--keystore-path <app.jks>', 'Path to your Keystore.')
    .option('--keystore-alias <alias>', 'Keystore Alias')
    .option('--generate-keystore', 'Generate Keystore if one does not exist')
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .option('--skip-workflow-check', 'Skip warning about build service bare workflow limitations.')
    .option('-t --type <build>', 'Type of build: [app-bundle|apk].')
    .description(
      'Build a standalone APK or App Bundle for your project, signed and ready for submission to the Google Play Store.'
    )
    .asyncActionProjectDir(
      async (projectDir: string, options: AndroidOptions) => {
        if (!options.skipWorkflowCheck) {
          if (await maybeBailOnWorkflowWarning(projectDir, 'android')) {
            return;
          }
        }

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
        options.type = await askBuildType(options.type, {
          apk: 'Build a package to deploy to the store or install directly on Android devices',
          'app-bundle': 'Build an optimized bundle for the store',
        });
        const androidBuilder = new AndroidBuilder(projectDir, options);
        return androidBuilder.command();
      },
      { checkConfig: true }
    );

  program
    .command('build:web [project-dir]')
    .option('-c, --clear', 'Clear all cached build files and assets.')
    .option(
      '--no-pwa',
      'Prevent webpack from generating the manifest.json and injecting meta into the index.html head.'
    )
    .option('-d, --dev', 'Turns dev flag on before bundling')
    .description('Build a production bundle for your project, compressed and ready for deployment.')
    .asyncActionProjectDir(
      (projectDir: string, options: { pwa: boolean; clear: boolean; dev: boolean }) => {
        return Webpack.bundleAsync(projectDir, {
          ...options,
          dev: typeof options.dev === 'undefined' ? false : options.dev,
        });
      }
    );

  program
    .command('build:status [project-dir]')
    .alias('bs')
    .option(
      '--public-url <url>',
      'The URL of an externally hosted manifest (for self-hosted apps).'
    )
    .description(`Gets the status of a current (or most recently finished) build for your project.`)
    .asyncActionProjectDir(async (projectDir: string, options: { publicUrl?: string }) => {
      if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
        throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
      }
      const builder = new BaseBuilder(projectDir, options);
      return builder.commandCheckStatus();
    });
}
