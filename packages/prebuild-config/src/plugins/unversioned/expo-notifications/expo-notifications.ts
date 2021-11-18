import { createLegacyPlugin } from '../createLegacyPlugin';
import {
  withNotificationIconColor,
  withNotificationIcons,
  withNotificationManifest,
} from './withAndroidNotifications';

export default createLegacyPlugin({
  packageName: 'expo-notifications',
  fallback: [
    // Android
    withNotificationManifest,
    withNotificationIconColor,
    withNotificationIcons,
  ],
});
