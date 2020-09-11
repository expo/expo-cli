import { ExpoConfig, getConfig } from '@expo/config';
import { Versions } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';

import log from '../log';
import prompt from '../prompt';
import * as Eject from './eject/Eject';
import * as LegacyEject from './eject/LegacyEject';

async function userWantsToEjectWithoutUpgradingAsync() {
  const answer = await prompt({
    type: 'confirm',
    name: 'ejectWithoutUpgrading',
    message: `We recommend upgrading to the latest SDK version before ejecting. SDK 37 introduces support for OTA updates and notifications in ejected projects, and includes many features that make ejecting your project easier. Would you like to continue ejecting anyways?`,
  });

  return answer.ejectWithoutUpgrading;
}

async function action(
  projectDir: string,
  options: LegacyEject.EjectAsyncOptions | Eject.EjectAsyncOptions
) {
  let exp: ExpoConfig;
  try {
    exp = getConfig(projectDir).exp;
  } catch (error) {
    log();
    log(chalk.red(error.message));
    log();
    process.exit(1);
  }

  // Set EXPO_VIEW_DIR to universe/exponent to pull expo view code locally instead of from S3 for ExpoKit
  if (Versions.lteSdkVersion(exp, '36.0.0')) {
    // Don't show a warning if we haven't released SDK 37 yet
    const latestReleasedVersion = await Versions.newestReleasedSdkVersionAsync();
    if (Versions.lteSdkVersion({ sdkVersion: latestReleasedVersion.version }, '36.0.0')) {
      await LegacyEject.ejectAsync(projectDir, options as LegacyEject.EjectAsyncOptions);
    } else {
      if (options.force || (await userWantsToEjectWithoutUpgradingAsync())) {
        await LegacyEject.ejectAsync(projectDir, options as LegacyEject.EjectAsyncOptions);
      }
    }
  } else {
    await Eject.ejectAsync(projectDir, options as Eject.EjectAsyncOptions);
  }
}

export default function (program: Command) {
  program
    .command('eject [path]')
    .description(
      // TODO: Use Learn more link when it lands
      `Create native iOS and Android project files. Read more: https://expo.fyi/eject`
    )
    .longDescription(
      'Create Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.'
    )
    .helpGroup('eject')
    .option(
      '--eject-method [type]',
      `Eject method to use. [Depreacted]: Ejecting to ExpoKit is not available on SDK >= 37 and not recommended for older SDK versions. We recommend updating to SDK >= 37 and ejecting to bare.`,
      (value: string) => value.toLowerCase()
    )
    .option(
      '-f --force',
      'Will attempt to generate an iOS project even when the system is not running macOS. Unsafe and may fail.'
    )
    .asyncActionProjectDir(action);
}
