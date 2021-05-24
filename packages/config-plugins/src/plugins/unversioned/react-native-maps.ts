import resolveFrom from 'resolve-from';

import { ConfigPlugin } from '../../Plugin.types';
import { withGoogleMapsApiKey } from '../../android/GoogleMapsApiKey';
import { withPermissions } from '../../android/Permissions';
import { withMaps as withMapsIOS } from '../../ios/Maps';
import { createLegacyPlugin } from './createLegacyPlugin';

const LOCATION_USAGE = 'Allow $(PRODUCT_NAME) to access your location';

// Copied from expo-location package, this gets used when the
// user has react-native-maps installed but not expo-location.
const withDefaultLocationPermissions: ConfigPlugin = config => {
  // Only add location permissions if react-native-maps is installed.
  if (
    config._internal?.projectRoot &&
    resolveFrom.silent(config._internal.projectRoot, 'react-native-maps')
  ) {
    if (!config.ios) config.ios = {};
    if (!config.ios.infoPlist) config.ios.infoPlist = {};
    config.ios.infoPlist.NSLocationWhenInUseUsageDescription =
      config.ios.infoPlist.NSLocationWhenInUseUsageDescription || LOCATION_USAGE;

    return withPermissions(config, [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ]);
  }
  return config;
};

export default createLegacyPlugin({
  packageName: 'react-native-maps',
  fallback: [withGoogleMapsApiKey, withMapsIOS, withDefaultLocationPermissions],
});
