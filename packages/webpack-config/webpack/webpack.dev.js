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
const path_1 = __importDefault(require('path'));
const webpack_merge_1 = __importDefault(require('webpack-merge'));
const webpack_common_js_1 = __importDefault(require('./webpack.common.js'));
const getConfigAsync_1 = __importDefault(require('./utils/getConfigAsync'));
const createDevServerConfigAsync_1 = __importDefault(require('./createDevServerConfigAsync'));
function default_1(env, argv) {
  return __awaiter(this, void 0, void 0, function*() {
    if (!env.config) {
      // Fill all config values with PWA defaults
      env.config = yield getConfigAsync_1.default(env);
    }
    const devServer = yield createDevServerConfigAsync_1.default(env, argv, false);
    return webpack_merge_1.default(yield webpack_common_js_1.default(env, argv), {
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
          path_1.default.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
      },
      devServer,
    });
  });
}
exports.default = default_1;
//# sourceMappingURL=webpack.dev.js.map
