export const DEFAULT_ALIAS = {
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

function isObject(val: any): boolean {
  if (val === null) {
    return false;
  }
  return typeof val === 'function' || typeof val === 'object';
}

/**
 * Given a config option that could evalutate to true, config, or null; return a config.
 * e.g.
 * `polyfill: true` returns the `config`
 * `polyfill: {}` returns `{}`
 */

export function enableWithPropertyOrConfig(
  prop: any,
  config: boolean | { [key: string]: any },
  merge: boolean = false
): any {
  // Value is truthy.
  if (prop) {
    if (isObject(prop)) {
      if (merge) {
        if (config == null || typeof config !== 'object') {
          throw new Error('enableWithPropertyOrConfig cannot merge config: ' + config);
        }
        return {
          ...config,
          ...prop,
        };
      }

      // Return property
      return prop;
    }

    // Value is truthy but not a replacement config, thus return the default config.
    return config;
  }
  // Return falsey.
  return prop;
}

/**
 * Used for features that are enabled by default unless specified otherwise.
 */
export function overrideWithPropertyOrConfig(
  prop: any,
  config: boolean | { [key: string]: any },
  merge: boolean = false
): any {
  if (prop === undefined) {
    return config;
  }
  return enableWithPropertyOrConfig(prop, config, merge);
}
