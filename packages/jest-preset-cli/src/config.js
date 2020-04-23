const path = require('path');
const readPkg = require('read-pkg');

function getConfig(cwd) {
  return {
    preset: '@expo/jest-preset-cli',
    rootDir: path.resolve(cwd),
    displayName: readPkg.sync({ cwd }).name,
  };
}

module.exports = {
  getConfig,
};
