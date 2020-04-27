const path = require('path');

module.exports = {
  preset: '@expo/jest-preset-cli',
  displayName: require('../package').name,
  rootDir: path.resolve(__dirname, '..'),
  roots: ['e2e'],
};
