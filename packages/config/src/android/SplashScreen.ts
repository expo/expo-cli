import { ExpoConfig } from '../Config.types';
import { addWarningAndroid } from '../WarningAggregator';

export function getSplashScreen(config: ExpoConfig) {
  if (config.splash?.image || config.android?.splash?.mdpi) {
    return true;
  } else {
    return false;
  }
}

export async function setSplashScreenAsync(config: ExpoConfig, projectRoot: string) {
  let splash = getSplashScreen(config);
  if (!splash) {
    return;
  }

  addWarningAndroid(
    'splash',
    'This is the image that your app uses on the loading screen, we recommend installing and using expo-splash-screen.',
    'https://github.com/expo/expo/blob/master/packages/expo-splash-screen/README.md'
  );
}
