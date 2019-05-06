const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const getConfig = require('./utils/getConfig');

const createDevServerConfig = require('./createDevServerConfig');

module.exports = function(env = {}, argv) {
  if (!env.config) {
    // Fill all config values with PWA defaults
    env.config = getConfig(env);
  }

  const devServer = createDevServerConfig(env, argv);
  return merge(common(env, argv), {
    output: {
      // Add comments that describe the file import/exports.
      // This will make it easier to debug.
      pathinfo: true,
      // Give the output bundle a constant name to prevent caching.
      // Also there are no actual files generated in dev.
      filename: 'static/js/bundle.js',
      // There are also additional JS chunk files if you use code splitting.
      chunkFilename: 'static/js/[name].chunk.js',
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: info =>
        path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    devServer,
  });
};
