import fs from 'fs-extra';
import path from 'path';
import uniqueString from 'unique-string';

const tempDir = '/tmp/';

const getPath = () => path.join(tempDir, uniqueString());

module.exports.file = () => {
  return getPath() + '.' + ''.replace(/^\./, '');
};

module.exports.directory = () => {
  const directory = getPath();
  fs.ensureDirSync(directory);
  return directory;
};

Object.defineProperty(module.exports, 'root', {
  get() {
    return tempDir;
  },
});
