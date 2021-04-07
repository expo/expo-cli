import getenv from 'getenv';
import os from 'os';

export function home(): string {
  return os.homedir();
}

export function isDebug(): boolean {
  return getenv.boolish('EXPO_DEBUG', false);
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
