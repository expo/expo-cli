import path from 'path';
import tempy from 'tempy';
import fs from 'fs-extra';

export function getTempDir(suffix: string = '') {
  return path.join(tempy.directory(), suffix);
}

export function cleanTempDir(dir: string) {
  return fs.removeSync(dir);
}
