const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '..'),
  roots: ['src'],
  displayName: require('../package.json').name,
  testRegex: '/__(tests|testfixtures)__/.*(test|spec)\\.(j|t)sx?$',
  moduleNameMapper: {
    '^jest/(.*)': path.join(__dirname, '../../../jest/$1'),
  },
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: require.resolve('../babel.config.js') }],
  },
  testEnvironment: 'node',
  resetModules: false,
};
