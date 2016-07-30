/**
 * @flow
 */

import * as Binaries from './Binaries';

export function isPlatformSupported() {
  return process.platform === 'darwin';
}

export async function addToPathAsync() {
  if (!isPlatformSupported()) {
    return;
  }

  await Binaries.addToPathAsync('watchman');
}
