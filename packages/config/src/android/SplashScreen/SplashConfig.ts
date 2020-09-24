import { AndroidSplashScreenConfig } from '@expo/configure-splash-screen';

import { ExpoConfig, SplashScreenImageResizeMode } from '../../Config.types';

export function getSplashConfig(config: ExpoConfig): AndroidSplashScreenConfig | undefined {
  const image =
    config.android?.splash?.xxxhdpi ??
    config.android?.splash?.xxhdpi ??
    config.android?.splash?.xhdpi ??
    config.android?.splash?.hdpi ??
    config.android?.splash?.mdpi ??
    config.splash?.image;
  if (!image) {
    return;
  }

  const result: AndroidSplashScreenConfig = {
    imageResizeMode:
      config.android?.splash?.resizeMode ??
      config.splash?.resizeMode ??
      SplashScreenImageResizeMode.CONTAIN,
    backgroundColor:
      config.android?.splash?.backgroundColor ?? config.splash?.backgroundColor ?? '#FFFFFF', // white
    image,
    statusBar: config.android?.splash?.statusBar,
    darkMode: config.android?.splash?.darkMode,
  };

  return result;
}
