import { ExpoConfig } from '@expo/config-types';
import {
  AndroidSplashScreenConfig,
  configureAndroidSplashScreen,
  SplashScreenImageResizeMode,
} from '@expo/configure-splash-screen';

import { ConfigPlugin } from '../Plugin.types';
import { withDangerousMod } from '../plugins/core-plugins';
import * as WarningAggregator from '../utils/warnings';

export const withSplashScreen: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      await setSplashScreenAsync(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export function getSplashScreenConfig(config: ExpoConfig): AndroidSplashScreenConfig | undefined {
  if (!config.splash && !config.android?.splash) {
    return;
  }

  const result: AndroidSplashScreenConfig = {
    imageResizeMode:
      config.android?.splash?.resizeMode ??
      config.splash?.resizeMode ??
      SplashScreenImageResizeMode.CONTAIN,
    backgroundColor:
      config.android?.splash?.backgroundColor ?? config.splash?.backgroundColor ?? '#FFFFFF', // white
    image:
      config.android?.splash?.xxxhdpi ??
      config.android?.splash?.xxhdpi ??
      config.android?.splash?.xhdpi ??
      config.android?.splash?.hdpi ??
      config.android?.splash?.mdpi ??
      config.splash?.image,
  };

  return result;
}

export async function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  const splashScreenIsSupported =
    config.sdkVersion === '39.0.0' || config.sdkVersion === '40.0.0' || !config.sdkVersion;
  if (!splashScreenIsSupported) {
    WarningAggregator.addWarningAndroid(
      'splash',
      'Unable to automatically configure splash screen. Please refer to the expo-splash-screen README for more information: https://github.com/expo/expo/tree/master/packages/expo-splash-screen'
    );

    return;
  }

  const splashConfig = getSplashScreenConfig(config);
  if (!splashConfig) {
    return;
  }

  try {
    await configureAndroidSplashScreen(projectRoot, splashConfig);
  } catch (e) {
    WarningAggregator.addWarningAndroid('splash', e);
  }
}
