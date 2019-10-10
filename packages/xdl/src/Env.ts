import os from 'os';

import getenv from 'getenv';

export function home(): string {
  return os.homedir();
}

export function isStaging(): boolean {
  return getenv.boolish('EXPO_STAGING', false);
}

export function isLocal(): boolean {
  return getenv.boolish('EXPO_LOCAL', false);
}

export function skipManifestValidation(): boolean {
  return !!getenv.string('EXPO_SKIP_MANIFEST_VALIDATION_TOKEN');
}
