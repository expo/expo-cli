import { ConfigPlugin } from '../../Plugin.types';
import { withSplashScreen as withSplashScreenAndroid } from '../../android/SplashScreen/SplashScreen';
import { withSplashScreen as withSplashScreenIOS } from '../../ios/SplashScreen';
import { createRunOncePlugin } from '../core-plugins';
import { withStaticPlugin } from '../static-plugins';

const packageName = 'expo-splash-screen';

export const withSplashScreen: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedSplashScreen,
  });
};

const withUnversionedSplashScreen: ConfigPlugin = createRunOncePlugin(config => {
  config = withSplashScreenAndroid(config);
  config = withSplashScreenIOS(config);
  return config;
}, packageName);

export default withSplashScreen;
