import { getConfig } from '@expo/config';
import { Versions } from 'xdl';

import CommandError from '../../CommandError';
import Log from '../../log';
import { warnAboutLocalCLI } from '../../utils/migration';
import { confirmAsync } from '../../utils/prompts';
import { usesOldExpoUpdatesAsync } from '../utils/ProjectUtils';
import maybeBailOnGitStatusAsync from '../utils/maybeBailOnGitStatusAsync';
import { promptToClearMalformedNativeProjectsAsync } from './clearNativeFolder';
import { logNextSteps } from './logNextSteps';
import { assertPlatforms, platformsFromPlatform } from './platformOptions';
import { EjectAsyncOptions, prebuildAsync } from './prebuildAppAsync';

async function userWantsToEjectWithoutUpgradingAsync() {
  const answer = await confirmAsync({
    message: `We recommend upgrading to the latest SDK version before ejecting. SDK 37 introduces support for OTA updates and notifications in ejected projects, and includes many features that make ejecting your project easier. Would you like to continue ejecting anyways?`,
  });

  return answer;
}

/**
 * Entry point into the eject process, delegates to other helpers to perform various steps.
 *
 * 1. Verify git is clean
 * 2. Prebuild the project
 * 3. Log project info
 */
async function ejectAsync(
  projectRoot: string,
  { platforms, ...options }: EjectAsyncOptions
): Promise<void> {
  assertPlatforms(platforms);

  if (await maybeBailOnGitStatusAsync()) return;
  await promptToClearMalformedNativeProjectsAsync(projectRoot, platforms);

  const results = await prebuildAsync(projectRoot, { platforms, ...options });
  const legacyUpdates = await usesOldExpoUpdatesAsync(projectRoot);
  logNextSteps(results, { legacyUpdates });
}

export async function actionAsync(
  projectRoot: string,
  {
    platform,
    ...options
  }: Omit<EjectAsyncOptions, 'platforms'> & {
    npm?: boolean;
    platform?: string;
  }
) {
  warnAboutLocalCLI(projectRoot, { localCmd: 'prebuild' });

  const { exp } = getConfig(projectRoot);

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
    Log.debug('Eject Mode: Latest');
    await ejectAsync(projectRoot, {
      ...options,
      platforms: platformsFromPlatform(platform),
    } as EjectAsyncOptions);
  }
}
