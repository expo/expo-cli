import chalk from 'chalk';
import type { Command } from 'commander';
import { UrlUtils, Webpack } from 'xdl';

import CommandError from '../../CommandError';
import Log from '../../log';
import { confirmAsync } from '../../prompts';
import * as ProjectUtils from '../utils/ProjectUtils';
import AndroidBuilder from './AndroidBuilder';
import BaseBuilder from './BaseBuilder';
import { AndroidOptions, IosOptions } from './BaseBuilder.types';
import IOSBuilder from './ios/IOSBuilder';

async function maybeBailOnWorkflowWarning({
  projectRoot,
  platform,
  nonInteractive,
}: {
  projectRoot: string;
  platform: 'ios' | 'android';
  nonInteractive: boolean;
}) {
  const { workflow } = await ProjectUtils.findProjectRootAsync(projectRoot);
  if (workflow === 'managed') {
    return false;
  }

  const command = `expo build:${platform}`;
  Log.warn(chalk.bold(`⚠️  ${command} currently only supports managed workflow apps.`));
  Log.warn(
    `If you proceed with this command, we can run the build for you but it will not include any custom native modules or changes that you have made to your local native projects.`
  );
  Log.warn(
    `Unless you are sure that you know what you are doing, we recommend aborting the build and doing a native release build through ${
      platform === 'ios' ? 'Xcode' : 'Android Studio'
    }.`
  );

  if (nonInteractive) {
    Log.warn(`Skipping confirmation prompt because non-interactive mode is enabled.`);
    return false;
  }

  const answer = await confirmAsync({
    message: `Would you like to proceed?`,
  });

  return !answer;
}

function assertReleaseChannel(releaseChannel: any): asserts releaseChannel {
  const channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
  if (!channelRe.test(releaseChannel)) {
    throw new CommandError(
      'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
    );
  }
}

function assertPublicUrl(publicUrl: any) {
  if (publicUrl && !UrlUtils.isHttps(publicUrl)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL');
  }
}

export default function (program: Command) {
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
    .description('Build and sign a standalone IPA for the Apple App Store')
    .asyncActionProjectDir(
      async (projectRoot: string, options: IosOptions) => {
        if (!options.skipWorkflowCheck) {
          if (
            await maybeBailOnWorkflowWarning({
              projectRoot,
              platform: 'ios',
              nonInteractive: program.nonInteractive,
            })
          ) {
            return;
          }
        }
        if (options.skipCredentialsCheck && options.clearCredentials) {
          throw new CommandError(
            "--skip-credentials-check and --clear-credentials can't be used together"
          );
        }
        assertPublicUrl(options.publicUrl);
        assertReleaseChannel(options.releaseChannel);

        const iosBuilder = new IOSBuilder(projectRoot, options);
        return iosBuilder.command();
      },
      { checkConfig: true }
    );

  program
    .command('build:android [path]')
    .alias('ba')
    .helpGroup('build')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--no-publish', 'Disable automatic publishing before building.')
    .option('--no-wait', 'Exit immediately after triggering build.')
    .option('--keystore-path <app.jks>', 'Path to your Keystore.')
    .option('--keystore-alias <alias>', 'Keystore Alias')
    .option('--generate-keystore', '[deprecated] Generate Keystore if one does not exist')
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .option('--skip-workflow-check', 'Skip warning about build service bare workflow limitations.')
    .option('-t --type <build>', 'Type of build: [app-bundle|apk].')
    .description('Build and sign a standalone APK or App Bundle for the Google Play Store')
    .asyncActionProjectDir(
      async (projectRoot: string, options: AndroidOptions) => {
        if (options.generateKeystore) {
          Log.warn(
            `The --generate-keystore flag is deprecated and does not do anything. A Keystore will always be generated on the Expo servers if it's missing.`
          );
        }
        if (!options.skipWorkflowCheck) {
          if (
            await maybeBailOnWorkflowWarning({
              projectRoot,
              platform: 'android',
              nonInteractive: program.nonInteractive,
            })
          ) {
            return;
          }
        }

        assertPublicUrl(options.publicUrl);
        assertReleaseChannel(options.releaseChannel);

        const androidBuilder = new AndroidBuilder(projectRoot, options);
        return androidBuilder.command();
      },
      { checkConfig: true }
    );

  program
    .command('build:web [path]')
    .helpGroup('build')
    .option('-c, --clear', 'Clear all cached build files and assets.')
    .option(
      '--no-pwa',
      'Prevent webpack from generating the manifest.json and injecting meta into the index.html head.'
    )
    .option('-d, --dev', 'Turns dev flag on before bundling')
    .description('Build the web app for production')
    .asyncActionProjectDir(
      (projectRoot: string, options: { pwa: boolean; clear: boolean; dev: boolean }) => {
        return Webpack.bundleAsync(projectRoot, {
          ...options,
          dev: typeof options.dev === 'undefined' ? false : options.dev,
        });
      }
    );

  program
    .command('build:status [path]')
    .alias('bs')
    .helpGroup('build')
    .option(
      '--public-url <url>',
      'The URL of an externally hosted manifest (for self-hosted apps).'
    )
    .description(`Get the status of the latest build for the project`)
    .asyncActionProjectDir(async (projectRoot: string, options: { publicUrl?: string }) => {
      assertPublicUrl(options.publicUrl);
      const builder = new BaseBuilder(projectRoot, options);
      return builder.commandCheckStatus();
    });
}
