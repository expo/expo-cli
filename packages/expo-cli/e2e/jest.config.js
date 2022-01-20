const path = require('path');

const roots = ['../__mocks__', '.'];

module.exports = {
  preset: '../../../jest/unit-test-config',
  rootDir: path.resolve(__dirname),
  displayName: require('../package').name,
  roots,
  setupFilesAfterEnv: ['<rootDir>/../jest/setup-e2e.ts'],
};
