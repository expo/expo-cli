import { withSplashScreen as withSplashScreenAndroid } from '../../android/SplashScreen';
import { withSplashScreen as withSplashScreenIOS } from '../../ios/SplashScreen';
import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-splash-screen',
  fallback: [withSplashScreenAndroid, withSplashScreenIOS],
});
