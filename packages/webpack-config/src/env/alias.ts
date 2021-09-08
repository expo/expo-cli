import path from 'path';
import resolveFrom from 'resolve-from';
export function getAliases(projectRoot: string): Record<string, string> {
  // Even if the module isn't installed, react-native should be aliased to react-native-web for better errors.
  const aliases: Record<string, string> = {
    // Alias direct react-native imports to react-native-web
    'react-native$': resolveFrom(projectRoot, 'react-native-web'),
    'react-native-web/dist/exports/DeviceEventEmitter$': resolveFrom(
      projectRoot,
      'react-native-web/dist/exports/DeviceEventEmitter'
    ),
    'react-native-web/dist/vendor/react-native/emitter/EventEmitter$': resolveFrom(
      projectRoot,
      'react-native-web/dist/vendor/react-native/emitter/EventEmitter'
    ),
    // 'react-native-web': path.dirname(resolveFrom(projectRoot, 'react-native-web/package.json')),
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

  // TODO: Drop this...
  // Check if the installed version of react-native-web still supports NetInfo.
  if (resolveFrom.silent(projectRoot, 'react-native-web/dist/exports/NetInfo')) {
    aliases['@react-native-community/netinfo'] = 'react-native-web/dist/exports/NetInfo';
  }

  return aliases;
}
