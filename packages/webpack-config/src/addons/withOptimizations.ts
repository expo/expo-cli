import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import { boolish } from 'getenv';
import isWsl from 'is-wsl';
import TerserPlugin from 'terser-webpack-plugin';
import { Configuration } from 'webpack';

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
export default function withOptimizations(webpackConfig: Configuration): Configuration {
  if (webpackConfig.mode !== 'production') {
    webpackConfig.optimization = {
      ...webpackConfig.optimization,
      // Required for React Native packages that use import/export syntax:
      // https://webpack.js.org/configuration/optimization/#optimizationusedexports
      usedExports: false,
    };
    return webpackConfig;
  }

  const _isDebugMode = isDebugMode();

  webpackConfig.optimization = {
    // Required for React Native packages that use import/export syntax:
    // https://webpack.js.org/configuration/optimization/#optimizationusedexports
    usedExports: false,
    ...(webpackConfig.optimization || {}),

    // https://github.com/facebook/create-react-app/discussions/11278#discussioncomment-1808511
    splitChunks: {
      chunks: 'all',
    },
    nodeEnv: false,
    minimize: true,
    minimizer: [
      // This is only used in production mode
      // @ts-ignore
      new TerserPlugin({
        terserOptions: {
          parse: {
            // We want terser to parse ecma 8 code. However, we don't want it
            // to apply any minification steps that turns valid ecma 5 code
            // into invalid ecma 5 code. This is why the 'compress' and 'output'
            // sections only apply transformations that are ecma 5 safe
            // https://github.com/facebook/create-react-app/pull/4234
            ecma: 2018,
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
          mangle: _isDebugMode
            ? false
            : {
                safari10: true,
              },
          keep_classnames: _isDebugMode,
          keep_fnames: _isDebugMode,
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
      }),
      // This is only used in production mode
      new CssMinimizerPlugin(),
    ],
    // Skip the emitting phase whenever there are errors while compiling. This ensures that no erroring assets are emitted.
    emitOnErrors: false,
  };

  return webpackConfig;
}
