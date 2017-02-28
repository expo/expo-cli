/**
 * @flow
 */

import os from 'os';

export function home(): string {
  return os.homedir();
}

export function isStaging() {
  return !!process.env.EXPO_STAGING;
}

export function isLocal() {
  return !!process.env.EXPO_LOCAL;
}
