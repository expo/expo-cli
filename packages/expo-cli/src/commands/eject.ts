import { getConfig } from '@expo/config';
import { Versions } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';

import CommandError from '../CommandError';
import Log from '../log';
import { confirmAsync } from '../prompts';
import { ejectAsync } from './eject/ejectAsync';
import { platformsFromPlatform } from './eject/platformOptions';
import { EjectAsyncOptions } from './eject/prebuildAsync';
import { learnMore } from './utils/TerminalLink';

async function userWantsToEjectWithoutUpgradingAsync() {
  const answer = await confirmAsync({
    message: `We recommend upgrading to the latest SDK version before ejecting. It will be more difficult to upgrade your app after ejecting because you will also be responsible for native iOS and Android related upgrade steps. Continue ejecting?`,
  });

  return answer;
}

export async function actionAsync(
  projectDir: string,
  {
    platform,
    ...options
  }: Omit<EjectAsyncOptions, 'platforms'> & {
    npm?: boolean;
    platform?: string;
  }
) {
  const { exp } = getConfig(projectDir);
  const currentSdkVersionString = exp.sdkVersion!;
  const latestSdkVersion = await Versions.newestReleasedSdkVersionAsync();
  const latestSdkVersionString = latestSdkVersion.version;
  if (options.npm) {
    options.packageManager = 'npm';
  }

  // Set EXPO_VIEW_DIR to universe/exponent to pull expo view code locally instead of from S3 for ExpoKit
  if (Versions.lteSdkVersion(exp, '36.0.0')) {
    if (options.force || (await userWantsToEjectWithoutUpgradingAsync())) {
      throw new CommandError(
        `Ejecting to ExpoKit is now deprecated. Upgrade to Expo SDK +37 or downgrade to expo-cli@4.1.3`
      );
    }
  } else {
    if (currentSdkVersionString !== latestSdkVersionString) {
      if (await userWantsToEjectWithoutUpgradingAsync()) {
        Log.debug('Eject Mode: Latest');
        await ejectAsync(projectDir, {
          ...options,
          platforms: platformsFromPlatform(platform),
        } as EjectAsyncOptions);
      }
    } else {
      Log.debug('Eject Mode: Latest');
      await ejectAsync(projectDir, {
        ...options,
        platforms: platformsFromPlatform(platform),
      } as EjectAsyncOptions);
    }
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
    .option('--no-install', 'Skip installing npm packages and CocoaPods.')
    .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
    .option('-p, --platform [platform]', 'Platforms to sync: ios, android, all. Default: all')
    .asyncActionProjectDir(actionAsync);
}
