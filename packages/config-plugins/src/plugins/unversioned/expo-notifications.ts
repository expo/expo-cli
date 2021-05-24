import { ConfigPlugin } from '../../Plugin.types';
import {
  withNotificationIconColor,
  withNotificationIcons,
  withNotificationManifest,
} from '../../android/Notifications';
import { withEntitlementsPlist } from '../ios-plugins';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

const packageName = 'expo-notifications';

export const withNotifications: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedNotifications,
  });
};

const withNotificationsEntitlement: ConfigPlugin<'production' | 'development'> = (config, mode) => {
  return withEntitlementsPlist(config, config => {
    config.modResults['aps-environment'] = mode;
    return config;
  });
};

const withUnversionedNotifications: ConfigPlugin = createRunOncePlugin(config => {
  // Android
  config = withNotificationManifest(config);
  config = withNotificationIconColor(config);
  config = withNotificationIcons(config);

  // iOS
  config = withNotificationsEntitlement(config, 'development');

  return config;
}, packageName);

export default withNotifications;
