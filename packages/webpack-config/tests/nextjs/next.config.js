const withUnimodules = require('../../withUnimodules');
const projectRoot = process.cwd();

module.exports = {
  webpack(config, options) {
    // Further custom configuration here
    return withUnimodules(config, {
      projectRoot,
    });
  },
};
