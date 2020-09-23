import {
  AndroidSplashScreenConfig,
  configureAndroidSplashScreen,
  SplashScreenImageResizeMode,
} from '@expo/configure-splash-screen';

import { ExpoConfig } from '../Config.types';
import { addWarningAndroid } from '../WarningAggregator';

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
  const splashConfig = getSplashScreenConfig(config);
  if (!splashConfig) {
    return;
  }

  try {
    await configureAndroidSplashScreen(projectRoot, splashConfig);
  } catch (e) {
    addWarningAndroid('splash', e);
  }
}
