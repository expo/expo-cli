const path = require('path');
const readPkg = require('read-pkg');

const config = {
  rootDir: path.resolve(),
  displayName: readPkg.sync().name,
  testRegex: '/__tests__/.*(test|spec)\\.(j|t)sx?$',
  moduleFileExtensions: ['js', 'ts', 'json'],
  moduleNameMapper: {
    '^jest/(.*)': '../../jest/$1',
  },
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: require.resolve('../babel.config.js') }],
  },
  testEnvironment: 'node',
  resetModules: false,
};

module.exports = config;
