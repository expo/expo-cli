const path = require('path');
const { getConfig } = require('@expo/jest-preset-cli');

module.exports = {
  ...getConfig(path.resolve(__dirname, '..')),
  roots: ['e2e'],
};
