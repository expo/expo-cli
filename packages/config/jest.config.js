const path = require('path');

module.exports = {
  preset: '../../jest/unit-test-config',
  transformIgnorePatterns: ['node_modules/@babel/core'],
  verbose: true,
  rootDir: path.resolve(__dirname),
  displayName: require('./package').name,
  roots: ['__mocks__', 'src'],
};
