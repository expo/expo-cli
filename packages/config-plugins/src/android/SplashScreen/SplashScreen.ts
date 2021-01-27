import { ConfigPlugin } from '../../Plugin.types';
import { withPlugins } from '../../plugins/core-plugins';
import { getSplashConfig } from './SplashConfig';
import { withSplashDrawables } from './SplashDrawable';
import { withSplashDrawableImages } from './SplashImages';
import { withSplashMainActivity } from './SplashMainActivity';
import { withSplashStyles } from './SplashStyles';

export const withSplashScreen: ConfigPlugin = config => {
  const splashConfig = getSplashConfig(config);

  return withPlugins(config, [
    withSplashDrawableImages,
    [withSplashDrawables, splashConfig],
    withSplashMainActivity,
    withSplashStyles,
  ]);
};
