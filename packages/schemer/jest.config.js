const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname),
  displayName: require('@expo/schemer/package.json').name,
  testRegex: '/__tests__/.*(test|spec)\\.(j|t)sx?$',
  moduleNameMapper: {
    '^jest/(.*)': path.join(__dirname, '../../jest/$1'),
  },
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: require.resolve('./babel.config.js') }],
  },
  testEnvironment: 'node',
  resetModules: false,
};
