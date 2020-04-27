const path = require('path');

module.exports = {
  preset: '@expo/jest-preset-cli',
  displayName: require('../package').name,
  rootDir: path.resolve(__dirname, '..'),
  testRegex: '__integration_tests__/.*\\.js$',
  roots: ['src'],
  setupFilesAfterEnv: ['<rootDir>/jest/integration-test-setup.js'],
};
