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
