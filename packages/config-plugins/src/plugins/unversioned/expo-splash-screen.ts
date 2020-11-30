import { withSplashScreen as withSplashScreenAndroid } from '../../android/SplashScreen';
import { withSplashScreen as withSplashScreenIOS } from '../../ios/SplashScreen';
import { createRunOncePlugin } from '../core-plugins';

// Local unversioned splash screen plugin
const withSplashScreen = createRunOncePlugin(config => {
  config = withSplashScreenAndroid(config);
  config = withSplashScreenIOS(config);
  return config;
}, 'expo-splash-screen');

export default withSplashScreen;
