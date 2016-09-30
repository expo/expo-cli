/**
 * @flow
 */

import _ from 'lodash';
import spawnAsync from '@exponent/spawn-async';

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

export async function getVersionAsync() {
  if (!isPlatformSupported()) {
    return null;
  }
  // TODO: Use `watchman version` here and add a timeout
  // version is more correct, but will sometimes hang
  let result;
  try {
    result = await spawnAsync('watchman', ['--version']);
  } catch (e) {
    // TODO: Maybe check to make sure this is ENOENT (which means watchman isn't installed)
    // We might want to report other errors
    return null;
  }
  let watchmanVersion = _.trim(result.stdout);
  return watchmanVersion;
}
