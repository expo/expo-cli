import {
  AndroidSplashScreenConfig,
  SplashScreenImageResizeMode,
  configureAndroidSplashScreen,
} from '@expo/configure-splash-screen';
import { ExpoConfig } from '../Config.types';

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
      config.android?.splash?.backgroundColor || config.splash?.backgroundColor || '#FFFFFF', // white
    imagePath:
      config.android?.splash?.xxxhdpi ||
      config.android?.splash?.xxhdpi ||
      config.android?.splash?.xhdpi ||
      config.android?.splash?.hdpi ||
      config.android?.splash?.mdpi ||
      config.splash?.image,
  };

  return result;
}

export async function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  const splashConfig = getSplashScreenConfig(config);
  if (!splashConfig) {
    return;
  }

  await configureAndroidSplashScreen(projectRoot, splashConfig);
}
