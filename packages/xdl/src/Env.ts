import { ExpoConfig } from '@expo/config';
import getenv from 'getenv';

import { Versions } from './internal';

export function isDebug(): boolean {
  return getenv.boolish('EXPO_DEBUG', false);
}

export function isStaging(): boolean {
  return getenv.boolish('EXPO_STAGING', false);
}

export function isLocal(): boolean {
  return getenv.boolish('EXPO_LOCAL', false);
}

// TODO: remove this function once all related PRs have landed and there's no chance for conflict
export function isInterstitiaLPageEnabled(): boolean {
  return true;
}

export function maySkipManifestValidation(): boolean {
  return !!getenv.string('EXPO_SKIP_MANIFEST_VALIDATION_TOKEN');
}

/**
 * Returns true if we should use Metro using its JS APIs via @expo/dev-server (the modern and fast
 * way), false if we should fall back to spawning it as a subprocess (supported for backwards
 * compatibility with SDK39 and older).
 */
export function shouldUseDevServer(exp: Pick<ExpoConfig, 'sdkVersion'>) {
  return !Versions.lteSdkVersion(exp, '39.0.0') || getenv.boolish('EXPO_USE_DEV_SERVER', false);
}

// do not allow E2E to fire events
export function shouldEnableAnalytics() {
  return !getenv.boolish('E2E', false) && !getenv.boolish('CI', false);
}
