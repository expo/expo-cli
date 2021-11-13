import { createLegacyPlugin } from '../createLegacyPlugin';
import {
  withNotificationIconColor,
  withNotificationIcons,
  withNotificationManifest,
} from './withAndroidNotifications';
import { withIosNotificationsEntitlement } from './withIosNotificationsEntitlement';

export default createLegacyPlugin({
  packageName: 'expo-notifications',
  fallback: [
    // Android
    withNotificationManifest,
    withNotificationIconColor,
    withNotificationIcons,
    // iOS
    [withIosNotificationsEntitlement, 'development'],
  ],
});
