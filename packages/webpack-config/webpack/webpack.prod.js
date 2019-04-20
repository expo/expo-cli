const merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const isWsl = require('is-wsl');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const safePostCssParser = require('postcss-safe-parser');
const getConfig = require('./utils/getConfig');
const getPaths = require('./utils/getPaths');
const common = require('./webpack.common.js');
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
  if (!env.config) {
    // Fill all config values with PWA defaults
    env.config = getConfig(env);
  }

  const locations = getPaths(env);

  const appJSON = env.config || require(locations.appJson);
  if (!appJSON) {
    throw new Error('app.json could not be found at: ' + locations.appJson);
  }
  // For RN CLI support
  const appManifest = appJSON.expo || appJSON;
  const { web = {} } = appManifest;
  const { build: buildConfig = { verbose: false } } = web;
  const shouldUseSourceMap = buildConfig.devtool !== undefined && buildConfig.devtool;
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
        // We generate new versions of these based on the templates
        ignore: ['index.html', 'icon.png'],
      },
    ]),

    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: 'static/css/[name].[contenthash:8].css',
      chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
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
    output: {
      path: locations.production.folder,
      filename: 'static/js/[name].[contenthash:8].js',
      // There are also additional JS chunk files if you use code splitting.
      chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: info =>
        locations.absolute(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    optimization: {
      minimize: true,
      minimizer: [
        // This is only used in production mode
        new TerserPlugin({
          terserOptions: {
            parse: {
              // we want terser to parse ecma 8 code. However, we don't want it
              // to apply any minfication steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending futher investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          // Disabled on WSL (Windows Subsystem for Linux) due to an issue with Terser
          // https://github.com/webpack-contrib/terser-webpack-plugin/issues/21
          parallel: !isWsl,
          // Enable file caching
          cache: true,
          sourceMap: shouldUseSourceMap,
        }),
        // This is only used in production mode
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: safePostCssParser,
            map: shouldUseSourceMap
              ? {
                  // `inline: false` forces the sourcemap to be output into a
                  // separate file
                  inline: false,
                  // `annotation: true` appends the sourceMappingURL to the end of
                  // the css file, helping the browser find the sourcemap
                  annotation: true,
                }
              : false,
          },
        }),
      ],
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: {
        chunks: 'all',
        name: false,
      },
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      runtimeChunk: true,
    },
    plugins,
  });
};
