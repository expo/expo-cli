'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : new P(function(resolve) {
              resolve(result.value);
            }).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const terser_webpack_plugin_1 = __importDefault(require('terser-webpack-plugin'));
const is_wsl_1 = __importDefault(require('is-wsl'));
const optimize_css_assets_webpack_plugin_1 = __importDefault(
  require('optimize-css-assets-webpack-plugin')
);
// @ts-ignore
const webpack_merge_1 = __importDefault(require('webpack-merge'));
// @ts-ignore
const postcss_safe_parser_1 = __importDefault(require('postcss-safe-parser'));
const getenv_1 = require('getenv');
const getConfigAsync_1 = __importDefault(require('./utils/getConfigAsync'));
const getPathsAsync_1 = __importDefault(require('./utils/getPathsAsync'));
const webpack_common_1 = __importDefault(require('./webpack.common'));
function default_1(env, argv) {
  return __awaiter(this, void 0, void 0, function*() {
    if (!env.config) {
      // Fill all config values with PWA defaults
      env.config = yield getConfigAsync_1.default(env);
    }
    const locations = yield getPathsAsync_1.default(env);
    const commonConfig = yield webpack_common_1.default(env, argv);
    const shouldUseSourceMap = commonConfig.devtool !== null;
    const isDebugMode = getenv_1.boolish('EXPO_WEB_DEBUG', false);
    return webpack_merge_1.default(commonConfig, {
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
          new terser_webpack_plugin_1.default({
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
                warnings: isDebugMode,
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
              mangle: isDebugMode
                ? false
                : {
                    safari10: true,
                  },
              output: {
                ecma: 5,
                comments: isDebugMode,
                // Turned on because emoji and regex is not minified properly using default
                // https://github.com/facebook/create-react-app/issues/2488
                ascii_only: true,
              },
            },
            // Use multi-process parallel running to improve the build speed
            // Default number of concurrent runs: os.cpus().length - 1
            // Disabled on WSL (Windows Subsystem for Linux) due to an issue with Terser
            // https://github.com/webpack-contrib/terser-webpack-plugin/issues/21
            parallel: !is_wsl_1.default,
            // Enable file caching
            cache: true,
            sourceMap: shouldUseSourceMap,
          }),
          // This is only used in production mode
          new optimize_css_assets_webpack_plugin_1.default({
            cssProcessorOptions: {
              parser: postcss_safe_parser_1.default,
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
      },
    });
  });
}
exports.default = default_1;
//# sourceMappingURL=webpack.prod.js.map
