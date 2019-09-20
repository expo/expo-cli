const withUnimodules = require('../../withUnimodules');

module.exports = {
  webpack(config, options) {
    // Further custom configuration here
    return withUnimodules(config, {
      projectRoot: __dirname,
    });
  },
};
