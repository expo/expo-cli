const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname),
  displayName: require('expo-cli/package.json').name,
  testRegex: '/__tests__/.*(test|spec)\\.(j|t)s$',
  testEnvironment: 'node',
  resetModules: false,
};
