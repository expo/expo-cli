import { AndroidConfig, IOSConfig } from '@expo/config-plugins';

import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-splash-screen',
  fallback: [AndroidConfig.SplashScreen.withSplashScreen, IOSConfig.SplashScreen.withSplashScreen],
});
