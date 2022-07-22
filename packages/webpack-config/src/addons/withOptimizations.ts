import { boolish } from 'getenv';
import isWsl from 'is-wsl';
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import safePostCssParser from 'postcss-safe-parser';
import TerserPlugin from 'terser-webpack-plugin';

import { AnyConfiguration } from '../types';

/**
 * Returns `true` if the Expo web environment variable enabled.
 * @internal
 */
export function isDebugMode(): boolean {
  return boolish('EXPO_WEB_DEBUG', false);
}

/**
 * Add the minifier and other optimizations for production builds.
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @category addons
 */
export default function withOptimizations(webpackConfig: AnyConfiguration): AnyConfiguration {
  if (webpackConfig.mode !== 'production') {
    webpackConfig.optimization = {
      ...webpackConfig.optimization,
      // Required for React Native packages that use import/export syntax:
      // https://webpack.js.org/configuration/optimization/#optimizationusedexports
      usedExports: false,
    };
    return webpackConfig;
  }
  const shouldUseSourceMap = typeof webpackConfig.devtool === 'string';

  const _isDebugMode = isDebugMode();

  webpackConfig.optimization = {
    // Required for React Native packages that use import/export syntax:
    // https://webpack.js.org/configuration/optimization/#optimizationusedexports
    usedExports: false,
    ...(webpackConfig.optimization || {}),
    nodeEnv: false,
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
            warnings: _isDebugMode,
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
          mangle: _isDebugMode
            ? false
            : {
                safari10: true,
              },
          output: {
            ecma: 5,
            comments: _isDebugMode,
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

    // Skip the emitting phase whenever there are errors while compiling. This ensures that no erroring assets are emitted.
    noEmitOnErrors: true,
  };

  return webpackConfig;
}
