const withUnimodules = require('@expo/webpack-config/withUnimodules');
const { getWebExtensions } = require('@expo/webpack-config/utils');

module.exports = {
  pageExtensions: getWebExtensions(),
  webpack(config, options) {
    // Further custom configuration here
    return withUnimodules(config, {
      projectRoot: __dirname,
    });
  },
};
