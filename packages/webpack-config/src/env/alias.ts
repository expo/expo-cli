/** @internal */ /** */
import resolveFrom from 'resolve-from';

export function getAliases(projectRoot: string): Record<string, string> {
  // Even if the module isn't installed, react-native should be aliased to react-native-web for better errors.
  const aliases: Record<string, string> = {
    // Alias direct react-native imports to react-native-web
    'react-native$': 'react-native-web',
    // Alias internal react-native modules to react-native-web
    'react-native/Libraries/Components/View/ViewStylePropTypes$':
      'react-native-web/dist/exports/View/ViewStylePropTypes',
    'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$':
      'react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter',
    'react-native/Libraries/vendor/emitter/EventEmitter$':
      'react-native-web/dist/vendor/react-native/emitter/EventEmitter',
    'react-native/Libraries/vendor/emitter/EventSubscriptionVendor$':
      'react-native-web/dist/vendor/react-native/emitter/EventSubscriptionVendor',
    'react-native/Libraries/EventEmitter/NativeEventEmitter$':
      'react-native-web/dist/vendor/react-native/NativeEventEmitter',
  };
  // Check if the installed version of react-native-web still supports NetInfo.
  if (resolveFrom.silent(projectRoot, 'react-native-web/dist/exports/NetInfo')) {
    aliases['@react-native-community/netinfo'] = 'react-native-web/dist/exports/NetInfo';
  }

  // Add polyfills for modules that react-native-web doesn't support
  // Depends on expo-asset
  if (resolveFrom.silent(projectRoot, 'expo-asset')) {
    aliases['react-native/Libraries/Image/AssetSourceResolver$'] =
      'expo-asset/build/AssetSourceResolver';
    aliases['react-native/Libraries/Image/assetPathUtils$'] =
      'expo-asset/build/Image/assetPathUtils';
    aliases['react-native/Libraries/Image/resolveAssetSource$'] =
      'expo-asset/build/resolveAssetSource';
  }

  return aliases;
}
