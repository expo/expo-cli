const merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');

const common = require('./webpack.common.js');
const getLocations = require('./webpackLocations');

function debugTreeshaking() {
  return {
    /**
     * Use the following to Debug:
     * Runtime TypeError: Cannot read property 'call' of undefined at __webpack_require__
     * Shaking should still take place with this enabled
     *
     * namedModules: true,
     * namedChunks: true
     */
    namedModules: true,
    namedChunks: true,
    minimize: false,
    flagIncludedChunks: false,
    occurrenceOrder: false,
    concatenateModules: false,
    removeEmptyChunks: false,
    mergeDuplicateChunks: false,
    splitChunks: {
      hidePathInfo: false,
      minSize: 10000,
      maxAsyncRequests: Infinity,
      maxInitialRequests: Infinity,
    },
  };
}

module.exports = function(env = {}) {
  const locations = getLocations(env.projectRoot);

  const appEntry = [locations.appMain];

  const usePolyfills = !env.noPolyfill;

  if (usePolyfills) {
    appEntry.unshift('@babel/polyfill');
  }

  return merge(common(env), {
    mode: 'production',
    entry: {
      app: appEntry,
    },
    devtool: 'cheap-module-source-map',
    plugins: [
      // Delete the build folder
      new CleanWebpackPlugin([locations.production.folder], {
        root: locations.root,
        dry: false,
      }),

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

      // GZIP files
      new CompressionPlugin({
        test: /\.(js|css)$/,
        filename: '[path].gz[query]',
        algorithm: 'gzip',
        threshold: 1024,
        minRatio: 0.8,
      }),
      // Secondary compression for systems that serve .br
      new BrotliPlugin({
        asset: '[path].br[query]',
        test: /\.(js|css)$/,
        threshold: 1024,
        minRatio: 0.8,
      }),
    ],
  });
};
