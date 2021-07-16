import { getConfig } from '@expo/config';
import { Versions } from 'xdl';

import CommandError from '../CommandError';
import Log from '../log';
import { confirmAsync } from '../prompts';
import { ejectAsync } from './eject/ejectAsync';
import { platformsFromPlatform } from './eject/platformOptions';
import { EjectAsyncOptions } from './eject/prebuildAsync';

async function userWantsToEjectWithoutUpgradingAsync() {
  const answer = await confirmAsync({
    message: `We recommend upgrading to the latest SDK version before ejecting. SDK 37 introduces support for OTA updates and notifications in ejected projects, and includes many features that make ejecting your project easier. Would you like to continue ejecting anyways?`,
  });

  return answer;
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
