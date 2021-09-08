export function getPlatform() {
  return process.env.PLATFORM || require('react-native').Platform.OS;
}

export function showMessage(...args: string[]) {
  return require('react-native/Libraries/Utilities/LoadingView').showMessage(...args);
}
export function hide(...args: string[]) {
  return require('react-native/Libraries/Utilities/LoadingView').hide(...args);
}

export function dismissBuildError() {
  // TODO: Add a proper dismiss build error from react-error-overlay

  const platform = getPlatform();
  if (platform === 'ios') {
    const NativeRedBox = require('react-native/Libraries/NativeModules/specs/NativeRedBox').default;
    NativeRedBox?.dismiss?.();
  } else if (platform === 'android') {
    const NativeExceptionsManager = require('react-native/Libraries/Core/NativeExceptionsManager')
      .default;
    NativeExceptionsManager?.dismissRedbox();
  } else {
    console.clear();
    return;
  }
  const LogBoxData = require('react-native/Libraries/LogBox/Data/LogBoxData');
  LogBoxData.clear();
}
