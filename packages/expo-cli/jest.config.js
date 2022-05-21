const path = require('path');

const enableE2E = process.env.CI || process.env.E2E;

const roots = ['__mocks__', 'src'];

if (enableE2E) {
  roots.push('e2e');
}

module.exports = {
  preset: '../../jest/unit-test-config',
  rootDir: path.resolve(__dirname),
  displayName: require('./package').name,
  roots,
  setupFilesAfterEnv: ['<rootDir>/jest/setup.ts'],
  testTimeout: 60000,
  testRunner: 'jest-jasmine2',
};
