/**
 * @flow
 */

import fs from 'fs';
import tar from 'tar';
import path from 'path';
import spawnAsync from '@expo/spawn-async';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import uuid from 'uuid';

import * as Binaries from './Binaries';
import UserSettings from './UserSettings';

async function _extractWindowsAsync(archive: string, dir: string) {
  let dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  let tmpDir = path.join(dotExpoHomeDirectory, 'tmp', uuid.v4());
  mkdirp.sync(tmpDir);
  let binary = path.join(Binaries.getBinariesPath(), '7z1602-extra', '7za');
  try {
    await spawnAsync(binary, ['x', archive, '-aoa', `-o${tmpDir}`]);
    // We don't know the resulting filename after this step, so
    // just assume the only file in the directory is our .tar file.
    // This should be fine since we created the directory with a random name.
    let files = fs.readdirSync(tmpDir);
    let outputFile = path.resolve(tmpDir, files[0]);
    await spawnAsync(binary, ['x', outputFile, '-aoa', `-o${dir}`]);
  } catch (e) {
    console.error(e.message);
    console.error(e.stderr);
    throw e;
  } finally {
    rimraf.sync(tmpDir);
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
    // tar node module has previously had problems with big files, and seems to
    // be slower, so only use it as a backup.
    console.error(e.message);
    await tar.extract({ file: archive, cwd: dir });
  }
}
