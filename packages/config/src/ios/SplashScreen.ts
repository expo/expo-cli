import {
  IosSplashScreenConfig,
  SplashScreenImageResizeMode,
  configureIosSplashScreen,
} from '@expo/configure-splash-screen';
import { ExpoConfig } from '../Config.types';

export function getSplashScreen(config: ExpoConfig): IosSplashScreenConfig | undefined {
  if (!config.splash || !config.ios?.splash) {
    return;
  }

  const result: IosSplashScreenConfig = {
    imageResizeMode:
      config.ios?.splash?.resizeMode ??
      config.splash?.resizeMode ??
      SplashScreenImageResizeMode.CONTAIN,
    backgroundColor:
      config.ios?.splash?.backgroundColor || config.splash?.backgroundColor || '#FFFFFF', // white
    imagePath: config.ios?.splash?.image || config.splash?.image,
  };

  return result;
}

export async function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  const splashConfig = getSplashScreen(config);
  if (!splashConfig) {
    return;
  }

  await configureIosSplashScreen(projectRoot, splashConfig);
}
