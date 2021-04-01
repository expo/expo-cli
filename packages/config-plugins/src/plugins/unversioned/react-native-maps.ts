import resolveFrom from 'resolve-from';

import { ConfigPlugin } from '../../Plugin.types';
import { withGoogleMapsApiKey } from '../../android/GoogleMapsApiKey';
import { withPermissions } from '../../android/Permissions';
import { withMaps as withMapsIOS } from '../../ios/Maps';
import { createRunOncePlugin } from '../core-plugins';
import { withStaticPlugin } from '../static-plugins';

const packageName = 'react-native-maps';
const LOCATION_USAGE = 'Allow $(PRODUCT_NAME) to access your location';

// Copied from expo-location package, this gets used when the
// user has react-native-maps installed but not expo-location.
const withDefaultLocationPermissions: ConfigPlugin = config => {
  if (!config.ios) config.ios = {};
  if (!config.ios.infoPlist) config.ios.infoPlist = {};
  config.ios.infoPlist.NSLocationWhenInUseUsageDescription =
    config.ios.infoPlist.NSLocationWhenInUseUsageDescription || LOCATION_USAGE;

  return withPermissions(config, [
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_FINE_LOCATION',
  ]);
};

export const withMaps: ConfigPlugin = config => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    plugin: packageName,
    // If the static plugin isn't found, use the unversioned one.
    fallback: withUnversionedMaps,
  });
};

const withUnversionedMaps: ConfigPlugin = createRunOncePlugin(config => {
  config = withGoogleMapsApiKey(config);
  config = withMapsIOS(config);
  // Only add location permissions if react-native-maps is installed.
  if (
    config._internal?.projectRoot &&
    resolveFrom.silent(config._internal?.projectRoot!, 'react-native-maps')
  ) {
    config = withDefaultLocationPermissions(config);
  }
  return config;
}, packageName);

export default withMaps;
