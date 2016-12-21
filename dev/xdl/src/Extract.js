/**
 * @flow
 */

import targz from 'tar.gz';
import path from 'path';
import spawnAsync from '@exponent/spawn-async';

import * as Binaries from './Binaries';
import UserSettings from './UserSettings';

async function _extractWindowsAsync(archive: string, dir: string) {
  let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
  let tmpDir = path.join(dotExponentHomeDirectory, 'starter-app-cache', 'tmp');
  let fileNameNoExtension = path.basename(archive, path.extname(archive));
  let tmpFile = path.join(tmpDir, `${fileNameNoExtension}.tar`);
  let binary = path.join(Binaries.getBinariesPath(), '7z1602-extra', '7za');
  try {
    await spawnAsync(binary, ['x', archive, '-aoa', `-o${tmpDir}`]);
    await spawnAsync(binary, ['x', tmpFile, '-aoa', `-o${dir}`]);
  } catch (e) {
    console.error(e.message);
    console.error(e.stderr);
    throw e;
  }
}

export async function extractAsync(archive: string, dir: string) {
  try {
    if (process.platform === 'win32') {
      await _extractWindowsAsync(archive, dir);
    } else {
      await spawnAsync('tar', ['-xf', archive, '-C', dir], {
        stdio: 'inherit',
        cwd: __dirname,
      });
    }
  } catch (e) {
    // tar.gz node module doesn't work consistently with big files, so only
    // use it as a backup.
    console.error(e.message);
    await targz().extract(archive, dir);
  }
}
