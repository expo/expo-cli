const withUnimodules = require('../../withUnimodules');
const getWebExtensions = require('../../getWebExtensions');

module.exports = {
  pageExtensions: getWebExtensions(),
  webpack(config, options) {
    // Further custom configuration here
    return withUnimodules(config, {
      projectRoot: __dirname,
    });
  },
};
