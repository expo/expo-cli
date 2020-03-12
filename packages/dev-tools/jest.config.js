const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '.'),
  displayName: require('@expo/dev-tools/package.json').name,
  testRegex: `__(tests|testfixtures)__\/.*(\.|-)(test|spec)\.tsx?$`,
  moduleNameMapper: {
    '^jest/(.*)': path.join(__dirname, '../../jest/$1'),
  },
  transform: {
    '^.+\\.tsx?$': ['babel-jest', { configFile: require.resolve('./server/babel.config.js') }],
  },
  testEnvironment: 'node',
  resetModules: false,
};
