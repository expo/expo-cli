const path = require('path');

const roots = ['__mocks__', 'src'];

module.exports = {
  preset: '../../jest/unit-test-config',
  rootDir: path.resolve(__dirname),
  displayName: require('./package').name,
  roots,
  testTimeout: 60000,
  testRunner: 'jest-jasmine2',
};
