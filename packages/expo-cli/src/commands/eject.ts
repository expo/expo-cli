import { getConfig } from '@expo/config';
import { ModPlatform } from '@expo/config-plugins';
import { Versions } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';

import CommandError from '../CommandError';
import log from '../log';
import { confirmAsync } from '../prompts';
import * as Eject from './eject/Eject';
import * as LegacyEject from './eject/LegacyEject';
import { learnMore } from './utils/TerminalLink';

async function userWantsToEjectWithoutUpgradingAsync() {
  const answer = await confirmAsync({
    message: `We recommend upgrading to the latest SDK version before ejecting. SDK 37 introduces support for OTA updates and notifications in ejected projects, and includes many features that make ejecting your project easier. Would you like to continue ejecting anyways?`,
  });

  return answer;
}

function getDefaultPlatforms(): ModPlatform[] {
  const platforms: ModPlatform[] = ['android'];
  if (process.platform !== 'win32') {
    platforms.push('ios');
  }
  return platforms;
}

function platformsFromPlatform(platform?: string): ModPlatform[] {
  if (!platform) {
    return getDefaultPlatforms();
  }
  switch (platform) {
    case 'ios':
      if (process.platform === 'win32') {
        log.warn('Ejecting on windows is unsupported');
        // continue anyways :shrug:
      }
      return ['ios'];
    case 'android':
      return ['android'];
    case 'all':
      return getDefaultPlatforms();
    default:
      throw new CommandError(`Unsupported platform "${platform}". Options are: ios, android, all`);
  }
}

export async function actionAsync(
  projectDir: string,
  {
    platform,
    ...options
  }: (LegacyEject.EjectAsyncOptions | Eject.EjectAsyncOptions) & {
    npm?: boolean;
    platform?: string;
  }
) {
  const { exp } = getConfig(projectDir);

  if (options.npm) {
    options.packageManager = 'npm';
  }

  // Set EXPO_VIEW_DIR to universe/exponent to pull expo view code locally instead of from S3 for ExpoKit
  // TODO: remove LegacyEject when SDK 36 is no longer supported: after SDK 40 is released.
  if (Versions.lteSdkVersion(exp, '36.0.0')) {
    if (options.force || (await userWantsToEjectWithoutUpgradingAsync())) {
      log.debug('Eject Mode: Legacy');
      await LegacyEject.ejectAsync(projectDir, options as LegacyEject.EjectAsyncOptions);
    }
  } else {
    log.debug('Eject Mode: Latest');
    await Eject.ejectAsync(projectDir, {
      ...options,
      platforms: platformsFromPlatform(platform),
    } as Eject.EjectAsyncOptions);
  }
}

export default function (program: Command) {
  program
    .command('eject [path]')
    .description(
      `Create native iOS and Android project files. ${chalk.dim(
        learnMore('https://docs.expo.io/bare/customizing/')
      )}`
    )
    .longDescription(
      'Create Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.'
    )
    .helpGroup('eject')
    .option('--force', 'Skip legacy eject warnings.') // TODO: remove the force flag when SDK 36 is no longer supported: after SDK 40 is released.
    .option('--no-install', 'Skip installing npm packages and CocoaPods.')
    .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
    .option('-p, --platform [platform]', 'Platforms to sync: ios, android, all. Default: all')
    .asyncActionProjectDir(actionAsync);
}
