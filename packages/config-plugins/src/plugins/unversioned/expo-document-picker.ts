import * as WarningAggregator from '../../utils/warnings';
import { createLegacyPlugin } from './createLegacyPlugin';

export default createLegacyPlugin({
  packageName: 'expo-document-picker',
  fallback(config) {
    // This is an awkward requirement due to usesIcloudStorage being part of the Expo schema instead of plugin properties.
    // This warning will be skipped if expo-document-picker is installed.
    if (config.ios?.usesIcloudStorage) {
      WarningAggregator.addWarningIOS(
        'DocumentPicker',
        'Install expo-document-picker 9.1.0 or greater in the project to use ios.usesIcloudStorage'
      );
    }
    return config;
  },
});
