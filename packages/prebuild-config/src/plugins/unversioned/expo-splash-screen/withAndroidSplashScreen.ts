import { ConfigPlugin, WarningAggregator, withPlugins } from '@expo/config-plugins';

import { getAndroidSplashConfig } from './getAndroidSplashConfig';
import { withAndroidSplashDrawables } from './withAndroidSplashDrawables';
import { withAndroidSplashImages } from './withAndroidSplashImages';
import { withAndroidSplashMainActivity } from './withAndroidSplashMainActivity';
import { withAndroidSplashStyles } from './withAndroidSplashStyles';

export const withAndroidSplashScreen: ConfigPlugin = config => {
  const splashConfig = getAndroidSplashConfig(config);

  // Update the android status bar to match the splash screen
  // androidStatusBar applies info to the app activity style.
  const backgroundColor = splashConfig?.backgroundColor || '#ffffff';
  if (config.androidStatusBar?.backgroundColor) {
    if (
      backgroundColor.toLowerCase() !== config.androidStatusBar?.backgroundColor?.toLowerCase?.()
    ) {
      WarningAggregator.addWarningAndroid(
        'androidStatusBar.backgroundColor',
        'The androidStatusBar.backgroundColor color conflicts with the splash backgroundColor on Android'
      );
    }
  } else {
    if (!config.androidStatusBar) config.androidStatusBar = {};
    config.androidStatusBar.backgroundColor = backgroundColor;
  }

  return withPlugins(config, [
    withAndroidSplashImages,
    [withAndroidSplashDrawables, splashConfig],
    withAndroidSplashMainActivity,
    withAndroidSplashStyles,
  ]);
};
