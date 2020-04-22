const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '..'),
  roots: ['__mocks__', 'src'],
  displayName: require('../package.json').name,
  moduleNameMapper: {
    '^jest/(.*)': path.join(__dirname, '../../../jest/$1'),
  },
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: require.resolve(__dirname, '../babel.config.js') }],
  },
  testEnvironment: 'node',
};
