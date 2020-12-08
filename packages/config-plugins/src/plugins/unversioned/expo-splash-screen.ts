import { ConfigPlugin } from '../../Plugin.types';
import {
  getSplashScreenConfig as getSplashScreenAndroid,
  withSplashScreen as withSplashScreenAndroid,
} from '../../android/SplashScreen';
import {
  getSplashScreen as getSplashScreenIos,
  withSplashScreen as withSplashScreenIOS,
} from '../../ios/SplashScreen';
import { wrapWithWarning } from '../../utils/deprecation';
import { createRunOncePlugin } from '../core-plugins';
import { withStaticPlugin } from '../static-plugin';

const packageName = 'expo-splash-screen';

export const withSplashScreen: ConfigPlugin = createRunOncePlugin(config => {
  return withStaticPlugin(config, {
    plugin: packageName,
    fallback: wrapWithWarning({
      packageName,
      minimumVersion: '41.0.0',
      unversionedName: 'SplashScreen',
      updateUrl: '...',
      plugin: withUnversionedSplashScreen,
      shouldWarn(config) {
        return !!(getSplashScreenIos(config) ?? getSplashScreenAndroid(config));
      },
    }),
  });
}, packageName);

const withUnversionedSplashScreen: ConfigPlugin = config => {
  config = withSplashScreenAndroid(config);
  config = withSplashScreenIOS(config);
  return config;
};

export default withSplashScreen;
