'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DEFAULT_ALIAS = {
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
function getModuleFileExtensions(...platforms) {
  let fileExtensions = [];
  // Support both TypeScript and JavaScript
  for (const extension of ['ts', 'tsx', 'js', 'jsx']) {
    // Ensure order is correct: [platformA.js, platformB.js, js]
    for (const platform of [...platforms, '']) {
      fileExtensions.push([platform, extension].filter(Boolean).join('.'));
    }
  }
  // Always add this last
  fileExtensions.push('json');
  // Webpack requires a `.` before each value
  return fileExtensions.map(value => `.${value}`);
}
exports.getModuleFileExtensions = getModuleFileExtensions;
function isObject(val) {
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
function enableWithPropertyOrConfig(prop, config, merge = false) {
  // Value is truthy but not a replacement config.
  if (prop) {
    if (isObject(prop) && merge) {
      if (config == null || typeof config !== 'object') {
        throw new Error('enableWithPropertyOrConfig cannot merge config: ' + config);
      }
      return Object.assign({}, config, prop);
    }
    // Return the default config
    return config;
  }
  // Return falsey or replacement config.
  return prop;
}
exports.enableWithPropertyOrConfig = enableWithPropertyOrConfig;
/**
 * Used for features that are enabled by default unless specified otherwise.
 */
function overrideWithPropertyOrConfig(prop, config, merge = false) {
  if (prop === undefined) {
    return config;
  }
  return enableWithPropertyOrConfig(prop, config, merge);
}
exports.overrideWithPropertyOrConfig = overrideWithPropertyOrConfig;
//# sourceMappingURL=config.js.map
