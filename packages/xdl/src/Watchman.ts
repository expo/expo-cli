import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import fs from 'fs-extra';
import pTimeout from 'p-timeout';
import path from 'path';

import * as Binaries from './Binaries';

const WAIT_FOR_WATCHMAN_VERSION_MS = 3000;

export function isPlatformSupported(): boolean {
  return process.platform === 'darwin';
}

export async function addToPathAsync(): Promise<void> {
  if (!isPlatformSupported()) {
    return;
  }

  await Binaries.addToPathAsync('watchman');
}

export async function unblockAndGetVersionAsync(projectRoot?: string): Promise<string | null> {
  if (!isPlatformSupported()) {
    return null;
  }

  try {
    // `watchman version` returns:
    // {
    //  "version": "4.7.0"
    // }
    const result = await _unblockAndVersionAsync(projectRoot);
    const watchmanVersion = JSON.parse(result.stdout.trim()).version;
    return watchmanVersion;
  } catch (e) {
    // TODO: Maybe check to make sure this is ENOENT (which means watchman isn't installed)
    // We might want to report other errors
    return null;
  }
}

async function _unblockAndVersionAsync(projectRoot?: string): Promise<SpawnResult> {
  try {
    return await pTimeout(_versionAsync(), WAIT_FOR_WATCHMAN_VERSION_MS);
  } catch (error) {
    await _unblockAsync(projectRoot);
    return await pTimeout(
      _versionAsync(),
      WAIT_FOR_WATCHMAN_VERSION_MS,
      '`watchman version` failed even after `launchctl unload`'
    );
  }
}

async function _unblockAsync(projectRoot?: string): Promise<void> {
  if (process.env.TMPDIR && process.env.USER) {
    // XDL's copy of watchman:
    fs.removeSync(path.join(process.env.TMPDIR, `${process.env.USER}-state`));
    // homebrew's watchman:
    fs.removeSync(`/usr/local/var/run/watchman/${process.env.USER}-state`);
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

async function _versionAsync(): Promise<SpawnResult> {
  return await spawnAsync('watchman', ['version']);
}
