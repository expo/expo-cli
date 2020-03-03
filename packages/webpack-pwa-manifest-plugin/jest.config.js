const path = require('path');

module.exports = {
  displayName: require('@expo/webpack-pwa-manifest-plugin/package.json').name,
  testRegex: '/__tests__/.*(test|spec)\\.(j|t)sx?$',
  moduleNameMapper: {
    '^jest/(.*)': path.join(__dirname, '../../jest/$1'),
  },
  testEnvironment: 'node',
  resetModules: false,
};
