import { ExpoConfig } from '@expo/config';
import getenv from 'getenv';
import os from 'os';

import * as Versions from './Versions';

export function home(): string {
  return os.homedir();
}

export function isStaging(): boolean {
  return getenv.boolish('EXPO_STAGING', false);
}

export function isLocal(): boolean {
  return getenv.boolish('EXPO_LOCAL', false);
}

export function maySkipManifestValidation(): boolean {
  return !!getenv.string('EXPO_SKIP_MANIFEST_VALIDATION_TOKEN');
}

/**
 * Returns true if we should use Metro using its JS APIs via @expo/dev-server (the modern and fast
 * way), false if we should fall back to spawning it as a subprocess (supported for backwards
 * compatibility with SDK39 and older).
 */
export function shouldUseDevServer(exp: ExpoConfig) {
  return Versions.gteSdkVersion(exp, '40.0.0') || getenv.boolish('EXPO_USE_DEV_SERVER', false);
}
