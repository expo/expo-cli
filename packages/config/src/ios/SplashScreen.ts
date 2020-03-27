import { ExpoConfig } from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';

export function getSplashScreen(config: ExpoConfig) {
  if (config.splash || config.ios?.splash) {
    return true;
  } else {
    return false;
  }
}

export function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  let splash = getSplashScreen(config);
  if (!splash) {
    return;
  }

  addWarningIOS(
    'splash',
    'This is the image that your app uses on the loading screen, we recommend installing and using expo-splash-screen.',
    'https://github.com/expo/expo/blob/master/packages/expo-splash-screen/README.md'
  );
}
