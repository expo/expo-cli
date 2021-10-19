import { AndroidConfig, ConfigPlugin, IOSConfig } from '@expo/config-plugins';
import resolveFrom from 'resolve-from';

import { createLegacyPlugin } from './createLegacyPlugin';

const LOCATION_USAGE = 'Allow $(PRODUCT_NAME) to access your location';

// Copied from expo-location package, this gets used when the
// user has react-native-maps installed but not expo-location.
const withDefaultLocationPermissions: ConfigPlugin = config => {
  const isLinked =
    !config._internal?.autolinking || config._internal.autolinking.includes('react-native-maps');
  // Only add location permissions if react-native-maps is installed.
  if (
    config._internal?.projectRoot &&
    resolveFrom.silent(config._internal.projectRoot, 'react-native-maps') &&
    isLinked
  ) {
    if (!config.ios) config.ios = {};
    if (!config.ios.infoPlist) config.ios.infoPlist = {};
    config.ios.infoPlist.NSLocationWhenInUseUsageDescription =
      config.ios.infoPlist.NSLocationWhenInUseUsageDescription || LOCATION_USAGE;

    return AndroidConfig.Permissions.withPermissions(config, [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ]);
  }
  return config;
};

export default createLegacyPlugin({
  packageName: 'react-native-maps',
  fallback: [
    AndroidConfig.GoogleMapsApiKey.withGoogleMapsApiKey,
    IOSConfig.Maps.withMaps,
    withDefaultLocationPermissions,
  ],
});
