const path = require('path');

module.exports = {
  preset: '../../jest/unit-test-config',
  transformIgnorePatterns: ['@babel/register'],
  verbose: true,
  rootDir: path.resolve(__dirname),
  displayName: require('./package').name,
  roots: ['__mocks__', 'src'],
};
