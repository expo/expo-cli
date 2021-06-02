import { ConfigPlugin, withPlugins } from '@expo/config-plugins';

import { getAndroidSplashConfig } from './getSplashConfig';
import { withAndroidSplashDrawables } from './withAndroidSplashDrawables';
import { withAndroidSplashImages } from './withAndroidSplashImages';
import { withAndroidSplashMainActivity } from './withAndroidSplashMainActivity';
import { withAndroidSplashStyles } from './withAndroidSplashStyles';

export const withAndroidSplashScreen: ConfigPlugin = config => {
  const splashConfig = getAndroidSplashConfig(config);

  return withPlugins(config, [
    withAndroidSplashImages,
    [withAndroidSplashDrawables, splashConfig],
    withAndroidSplashMainActivity,
    withAndroidSplashStyles,
  ]);
};
