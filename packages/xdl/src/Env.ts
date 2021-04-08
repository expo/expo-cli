import { ExpoConfig } from '@expo/config';
import { boolish, string } from 'getenv';

import { Versions } from './internal';

export function isDebug(): boolean {
  return boolish('EXPO_DEBUG', false);
}

export function maySkipManifestValidation(): boolean {
  return !!string('EXPO_SKIP_MANIFEST_VALIDATION_TOKEN');
}

/**
 * Returns true if we should use Metro using its JS APIs via @expo/dev-server (the modern and fast
 * way), false if we should fall back to spawning it as a subprocess (supported for backwards
 * compatibility with SDK39 and older).
 */
export function shouldUseDevServer(exp: ExpoConfig) {
  return Versions.gteSdkVersion(exp, '40.0.0') || boolish('EXPO_USE_DEV_SERVER', false);
}
