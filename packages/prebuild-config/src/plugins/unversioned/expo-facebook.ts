import { AndroidConfig, IOSConfig } from '@expo/config-plugins';

import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-facebook',
  fallback: [
    AndroidConfig.Facebook.withFacebookManifest,
    AndroidConfig.Facebook.withFacebookAppIdString,
    IOSConfig.Facebook.withFacebook,
  ],
});
