const merge = require('webpack-merge');
const webpackConfig = require('./webpack/webpack.config.unimodules');

// Wrap your existing webpack config with support for Unimodules.
// ex: Storybook `({ config }) => withUnimodules(config)`
module.exports = async function withUnimodules(inputWebpackConfig = {}, env = {}, argv = {}) {
  const expoConfig = await webpackConfig(
    {
      // Attempt to use the input webpack config mode
      mode: inputWebpackConfig.mode,
      ...env,
    },
    argv
  );
  return merge(expoConfig, inputWebpackConfig);
};
