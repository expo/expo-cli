/**
 * Polyfill the window.location property for HMR tooling.
 * We do this by getting the URL from a native module that React Native surfaces.
 * HMR tools will use window.location to connect to the proper WebSocket server: `ws://127.0.0.1:19006/sockjs-node`
 */
declare const window: any;

if (!('location' in window)) {
  window.location = {};
}

if (!('host' in window.location)) {
  let url: string = '';
  try {
    // `react-native` breaks if you attempt to import it statically here
    // for now just use the global to access the script URL.
    if ('nativeModuleProxy' in global) {
      // @ts-ignore
      url = ((global.nativeModuleProxy || {}).SourceCode || {}).scriptURL;
    }
  } catch {}
  // TODO: Define missing url via bundler
  // TODO: What will we do in production? HMR isn't needed in prod, but people may attempt to depend on it.
  if (!url) url = 'http://localhost:8081/';
  const { parse } = require('url');
  window.location = parse(url);
}

if (!('reload' in window.location)) {
  window.location.reload = () => {
    const { DevSettings } = require('react-native');
    DevSettings.reload();
  };
}

if (!('addEventListener' in window)) {
  window.addEventListener = (eventName: string, listener: any) => {};
}

if (!('removeEventListener' in window)) {
  window.removeEventListener = (eventName: string, listener: any) => {};
}

// Clear the warnings/errors in-app instead
console.clear = () => {
  // Clear native errors
  const { Platform } = require('react-native');
  if (Platform.OS === 'ios') {
    const NativeRedBox = require('react-native/Libraries/NativeModules/specs/NativeRedBox').default;
    NativeRedBox?.dismiss?.();
  } else {
    const NativeExceptionsManager = require('react-native/Libraries/Core/NativeExceptionsManager')
      .default;
    NativeExceptionsManager?.dismissRedbox();
  }

  // Clear everything else
  const LogBoxData = require('react-native/Libraries/LogBox/Data/LogBoxData');
  LogBoxData.clear();
};
