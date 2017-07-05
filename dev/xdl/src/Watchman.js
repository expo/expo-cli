/**
 * @flow
 */

import _ from 'lodash';
import spawnAsync from '@expo/spawn-async';
import delayAsync from 'delay-async';
import rimraf from 'rimraf';
import path from 'path';

import * as Analytics from './Analytics';
import * as Binaries from './Binaries';

const WAIT_FOR_WATCHMAN_VERSION_MS = 3000;

export function isPlatformSupported() {
  return process.platform === 'darwin';
}

export async function addToPathAsync() {
  if (!isPlatformSupported()) {
    return;
  }

  await Binaries.addToPathAsync('watchman');
}

export async function unblockAndGetVersionAsync(projectRoot?: string) {
  if (!isPlatformSupported()) {
    return null;
  }

  try {
    // `watchman version` returns:
    // {
    //  "version": "4.7.0"
    // }
    let result = await _unblockAndVersionAsync(projectRoot);
    let watchmanVersion = JSON.parse(_.trim(result.stdout)).version;
    return watchmanVersion;
  } catch (e) {
    // TODO: Maybe check to make sure this is ENOENT (which means watchman isn't installed)
    // We might want to report other errors
    return null;
  }
}

async function _unblockAndVersionAsync(projectRoot?: string) {
  let cancelObject = {
    isDoneWithVersionCheck: false,
  };

  let result = await Promise.race([
    _unblockAsync(projectRoot, cancelObject),
    _versionAsync(cancelObject),
  ]);

  if (result.isUnblock) {
    result = await Promise.race([
      _versionAsync(),
      async () => {
        await delayAsync(WAIT_FOR_WATCHMAN_VERSION_MS);
        throw new Error(
          `\`watchman version\` failed even after \`launchctl unload\``
        );
      },
    ]);
    Analytics.logEvent('version after launchctl unload');
    return result;
  } else {
    return result;
  }
}

async function _unblockAsync(projectRoot?: string, cancelObject) {
  await delayAsync(WAIT_FOR_WATCHMAN_VERSION_MS);

  if (!cancelObject.isDoneWithVersionCheck) {
    Analytics.logEvent('launchctl unload');
    if (process.env.TMPDIR && process.env.USER) {
      // XDL's copy of watchman:
      rimraf.sync(path.join(process.env.TMPDIR, `${process.env.USER}-state`));
      // homebrew's watchman:
      rimraf.sync(`/usr/local/var/run/watchman/${process.env.USER}-state`);
    }
    if (process.platform === 'darwin') {
      await spawnAsync('launchctl', [
        'unload',
        '-F',
        '~/Library/LaunchAgents/com.github.facebook.watchman.plist',
      ]);
    }
    if (projectRoot) {
      await spawnAsync('watchman', ['watch-del', projectRoot]);
      await spawnAsync('watchman', ['watch-project', projectRoot]);
    }
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
