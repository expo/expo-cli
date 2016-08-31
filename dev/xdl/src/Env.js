/**
 * @flow
 */

import os from 'os';

export function home(): string {
  return os.homedir();
}

export function isStaging() {
  return !!process.env.EXPONENT_STAGING;
}

export function isLocal() {
  return !!process.env.EXPONENT_LOCAL;
}
