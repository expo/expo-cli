import { WarningAggregator } from '@expo/config-plugins';

import { createLegacyPlugin } from '../createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-notifications',
  fallback(config) {
    // This is an awkward requirement due to notification being part of the Expo schema instead of plugin properties.
    // To keep logic consolidated, we no longer support configuring notifications outside of the expo-notifications package.
    // This warning will be skipped if expo-notifications is installed.
    if (config.notification) {
      // TODO: This warning should apply to both ios and android...
      WarningAggregator.addWarningAndroid(
        'notification',
        'Install expo-notifications 11.0.0 or greater in the project to configure native notifications'
      );
    }
    return config;
  },
});
