const path = require('path');

module.exports = {
  preset: '../../jest/unit-test-config',
  rootDir: path.resolve(__dirname, '..'),
  displayName: require('../package.json').name,
  roots: ['src'],
  testTimeout: 20000,
  testRegex: '__integration_tests__/.*(test|spec)\\.[jt]sx?$',
};
