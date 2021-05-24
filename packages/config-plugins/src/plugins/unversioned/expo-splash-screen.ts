import { ConfigPlugin } from '../../Plugin.types';
import { withSplashScreen as withSplashScreenAndroid } from '../../android/SplashScreen';
import { withSplashScreen as withSplashScreenIOS } from '../../ios/SplashScreen';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

const packageName = 'expo-splash-screen';

export const withSplashScreen: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
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
