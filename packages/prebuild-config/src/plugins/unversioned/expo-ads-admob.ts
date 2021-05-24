import { AndroidConfig, IOSConfig } from '@expo/config-plugins';

import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-ads-admob',
  fallback: [AndroidConfig.AdMob.withAdMob, IOSConfig.AdMob.withAdMob],
});
