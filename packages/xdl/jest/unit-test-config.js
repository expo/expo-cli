const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '..'),
  roots: ['__mocks__', 'src'],
  displayName: require('@expo/xdl/package.json').name,
  testRegex: '/__(tests|testfixtures)__/.*(test|spec)\\.(j|t)sx?$',
  moduleNameMapper: {
    '^jest/(.*)': path.join(__dirname, '../../../jest/$1'),
  },
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: require.resolve('../babel.config.js') }],
  },
  testEnvironment: 'node',
  resetModules: false,
  setupFiles: ['<rootDir>/jest/fs-mock-setup.js'],
};
