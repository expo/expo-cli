import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import tar from 'tar';
import uuid from 'uuid';

import * as Binaries from './Binaries';
import UserSettings from './UserSettings';

async function _extractWindowsAsync(archive: string, dir: string) {
  const dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  const tmpDir = path.join(dotExpoHomeDirectory, 'tmp', uuid.v4());
  fs.mkdirpSync(tmpDir);
  const binary = path.join(Binaries.getBinariesPath(), '7z1602-extra', '7za');
  try {
    await spawnAsync(binary, ['x', archive, '-aoa', `-o${tmpDir}`]);
    // We don't know the resulting filename after this step, so
    // just assume the only file in the directory is our .tar file.
    // This should be fine since we created the directory with a random name.
    const files = fs.readdirSync(tmpDir);
    const outputFile = path.resolve(tmpDir, files[0]);
    await spawnAsync(binary, ['x', outputFile, '-aoa', `-o${dir}`]);
  } catch (e) {
    console.error(e.message);
    console.error(e.stderr);
    throw e;
  } finally {
    fs.removeSync(tmpDir);
  }
}

export async function extractAsync(archive: string, dir: string): Promise<void> {
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
