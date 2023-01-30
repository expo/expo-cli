import getenv from 'getenv';

export const WEB_HOST = getenv.string('WEB_HOST', '0.0.0.0');

export const DEFAULT_PORT = getenv.int('WEB_PORT', 19006);

// When you have errors in the production build that aren't present in the development build you can use `EXPO_WEB_DEBUG=true expo start --no-dev` to debug those errors.
// - Prevent the production build from being minified
// - Include file path info comments in the bundle
export function isDebugModeEnabled(): boolean {
  return getenv.boolish('EXPO_WEB_DEBUG', false);
}
