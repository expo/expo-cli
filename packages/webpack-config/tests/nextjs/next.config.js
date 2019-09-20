const withUnimodules = require('../../withUnimodules');

module.exports = {
  webpack(config, options) {
    // Further custom configuration here
    return withUnimodules(config, {
      projectRoot:
        '/Users/eflyjason/Documents/Github/expo/expo-cli/packages/webpack-config/tests/nextjs/',
    });
  },
};
