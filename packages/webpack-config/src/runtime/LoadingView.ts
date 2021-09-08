export function getPlatform() {
  return process.env.PLATFORM || 'web';
}

export function showMessage(message: string, id: string) {
  const SyntheticPlatformEmitter = require('./SyntheticPlatformEmitter').default;
  // TODO: 'expo-modules-core';
  SyntheticPlatformEmitter.emit('devLoadingView:showMessage', {
    message,
  });
}
export function hide() {
  const SyntheticPlatformEmitter = require('./SyntheticPlatformEmitter').default;
  // TODO: 'expo-modules-core';
  SyntheticPlatformEmitter.emit('devLoadingView:hide', {});
}

export function dismissBuildError() {
  // TODO: Add a proper dismiss build error from react-error-overlay
  console.clear();
}
