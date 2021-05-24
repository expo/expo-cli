import { AndroidConfig, ConfigPlugin, withEntitlementsPlist } from '@expo/config-plugins';

import { createLegacyPlugin } from './createLegacyPlugin';

const withNotificationsEntitlement: ConfigPlugin<'production' | 'development'> = (config, mode) => {
  return withEntitlementsPlist(config, config => {
    config.modResults['aps-environment'] = mode;
    return config;
  });
};

export default createLegacyPlugin({
  packageName: 'expo-notifications',
  fallback: [
    // Android
    AndroidConfig.Notifications.withNotificationManifest,
    AndroidConfig.Notifications.withNotificationIconColor,
    AndroidConfig.Notifications.withNotificationIcons,
    // iOS
    [withNotificationsEntitlement, 'development'],
  ],
});
