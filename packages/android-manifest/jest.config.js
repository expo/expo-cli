const path = require('path');

module.exports = {
  displayName: require('./package.json').name,
  testRegex: '/__tests__/.*(test|spec)\\.(j|t)sx?$',
  moduleNameMapper: {
    '^jest/(.*)': path.join(__dirname, '../../jest/$1'),
  },
  testEnvironment: 'node',
  resetModules: false,
};
