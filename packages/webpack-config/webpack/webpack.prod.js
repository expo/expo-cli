const merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');

const common = require('./webpack.common.js');
const getLocations = require('./webpackLocations');
const { enableWithPropertyOrConfig, overrideWithPropertyOrConfig } = require('./utils/config');

const DEFAULT_GZIP = {
  test: /\.(js|css)$/,
  filename: '[path].gz[query]',
  algorithm: 'gzip',
  threshold: 1024,
  minRatio: 0.8,
};

const DEFAULT_BROTLI = {
  asset: '[path].br[query]',
  test: /\.(js|css)$/,
  threshold: 1024,
  minRatio: 0.8,
};

module.exports = function(env = {}, argv) {
  const locations = getLocations(env.projectRoot);

  const appJSON = require(locations.appJson);
  if (!appJSON) {
    throw new Error('app.json could not be found at: ' + locations.appJson);
  }
  // For RN CLI support
  const appManifest = appJSON.expo || appJSON;
  const { web = {} } = appManifest;
  const { build: buildConfig = {} } = web;
  /**
   * build: {
   *   verbose: boolean,
   *   brotli: boolean | {}, // (Brotli Options)
   *   gzip: boolean | CompressionPlugin.Options<O>,
   * }
   */

  const appEntry = [locations.appMain];

  if (env.polyfill) {
    appEntry.unshift('@babel/polyfill');
  }

  const plugins = [
    // Delete the build folder
    new CleanWebpackPlugin([locations.production.folder], {
      root: locations.root,
      dry: false,
      verbose: buildConfig.verbose,
    }),
    // Copy the template files over
    new CopyWebpackPlugin([
      {
        from: locations.template.folder,
        to: locations.production.folder,
        ignore: 'index.html',
      },
    ]),

    new MiniCssExtractPlugin({
      filename: 'static/css/[contenthash].css',
      chunkFilename: 'static/css/[contenthash].chunk.css',
    }),
  ];

  const gzipConfig = overrideWithPropertyOrConfig(buildConfig.gzip, DEFAULT_GZIP);
  if (gzipConfig) {
    plugins.push(new CompressionPlugin(gzipConfig));
  }

  const brotliConfig = enableWithPropertyOrConfig(buildConfig.brotli, DEFAULT_BROTLI);
  if (brotliConfig) {
    plugins.push(new BrotliPlugin(brotliConfig));
  }

  return merge(common(env, argv), {
    mode: 'production',
    entry: {
      app: appEntry,
    },
    devtool: 'cheap-module-source-map',
    plugins,
  });
};
