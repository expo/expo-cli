export const aliases = {
  // Alias direct react-native imports to react-native-web
  'react-native$': 'react-native-web',
  '@react-native-community/netinfo': 'react-native-web/dist/exports/NetInfo',
  // Add polyfills for modules that react-native-web doesn't support
  // Depends on expo-asset
  'react-native/Libraries/Image/AssetSourceResolver$': 'expo-asset/build/AssetSourceResolver',
  'react-native/Libraries/Image/assetPathUtils$': 'expo-asset/build/Image/assetPathUtils',
  'react-native/Libraries/Image/resolveAssetSource$': 'expo-asset/build/resolveAssetSource',
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
