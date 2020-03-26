import { ExpoConfig } from '../Config.types';
import { addWarningAndroid } from '../WarningAggregator';

export function getSplashScreen(config: ExpoConfig) {
  // Until we add support applying icon config we just test if the user has configured the icon
  // so we can warn
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
    'This is the image that your app uses on the loading screen, you will need to configure it manually.'
  );
}
