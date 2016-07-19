/**
 * @flow
 */

import spawnAsync from '@exponent/spawn-async';
import path from 'path';

export function isPlatformSupported() {
  return process.platform === 'darwin';
}

export async function addToPathAsync() {
  if (!isPlatformSupported()) {
    return;
  }

  try {
    let result = await spawnAsync('watchman', ['version']);
    if (result.stdout && result.stdout.length > 0) {
      return;
    }
  } catch (e) {
    // Add our copy of watchman to path
  }

  process.env.PATH = `${process.env.PATH}:${path.join(__dirname, '..', 'binaries', 'osx')}`;
}
