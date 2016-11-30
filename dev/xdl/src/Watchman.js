/**
 * @flow
 */

import _ from 'lodash';
import spawnAsync from '@exponent/spawn-async';
import delayAsync from 'delay-async';

import * as Binaries from './Binaries';

const WAIT_FOR_WATCHMAN_VERSION_MS = 5000;

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

export async function unblockAndGetVersionAsync() {
  if (!isPlatformSupported()) {
    return null;
  }

  try {
    // `watchman version` returns:
    // {
    //  "version": "4.7.0"
    // }
    let result = await _unblockAndVersionAsync();
    let watchmanVersion = JSON.parse(_.trim(result.stdout)).version;
    return watchmanVersion;
  } catch (e) {
    // TODO: Maybe check to make sure this is ENOENT (which means watchman isn't installed)
    // We might want to report other errors
    return null;
  }
}

async function _unblockAndVersionAsync() {
  let cancelObject = {
    isDoneWithVersionCheck: false,
  };

  let result = await Promise.race([
    _unblockAsync(cancelObject),
    _versionAsync(cancelObject),
  ]);

  if (result.isUnblock) {
    return await _versionAsync();
  } else {
    return result;
  }
}

async function _unblockAsync(cancelObject) {
  await delayAsync(WAIT_FOR_WATCHMAN_VERSION_MS);

  if (!cancelObject.isDoneWithVersionCheck) {
    await spawnAsync('launchctl', ['unload', '-F', '~/Library/LaunchAgents/com.github.facebook.watchman.plist']);
  }

  return {
    isUnblock: true,
  };
}

async function _versionAsync(cancelObject) {
  let result = await spawnAsync('watchman', ['version']);

  if (cancelObject) {
    cancelObject.isDoneWithVersionCheck = true;
  }

  return result;
}
