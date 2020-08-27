const path = require('path');

module.exports = {
  preset: '../../jest/unit-test-config',
  rootDir: path.resolve(__dirname, '..'),
  displayName: require('../package.json').name,
  roots: ['__mocks__', 'src'],
  setupFiles: ['<rootDir>/jest/fs-mock-setup.js'],
};
