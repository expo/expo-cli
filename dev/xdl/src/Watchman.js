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

  process.env.DYLD_LIBRARY_PATH = Binaries.OSX_SOURCE_PATH;
  await Binaries.addToPathAsync('watchman');
}
