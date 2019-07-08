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
const html_webpack_plugin_1 = __importDefault(require('html-webpack-plugin'));
const config_1 = require('./utils/config');
const getPathsAsync_1 = __importDefault(require('./utils/getPathsAsync'));
const getConfigAsync_1 = __importDefault(require('./utils/getConfigAsync'));
const getMode_1 = __importDefault(require('./utils/getMode'));
const DEFAULT_MINIFY = {
  removeComments: true,
  collapseWhitespace: true,
  removeRedundantAttributes: true,
  useShortDoctype: true,
  removeEmptyAttributes: true,
  removeStyleLinkTypeAttributes: true,
  keepClosingSlash: true,
  minifyJS: true,
  minifyCSS: true,
  minifyURLs: true,
};
function createIndexHTMLFromAppJSONAsync(env) {
  return __awaiter(this, void 0, void 0, function*() {
    const locations = yield getPathsAsync_1.default(env);
    const config = yield getConfigAsync_1.default(env);
    const isProduction = getMode_1.default(env) === 'production';
    const { name, build = {} } = config.web;
    /**
     * The user can disable minify with
     * `web.minifyHTML = false || {}`
     */
    const minify = config_1.overrideWithPropertyOrConfig(
      isProduction ? build.minifyHTML : false,
      DEFAULT_MINIFY
    );
    // Generates an `index.html` file with the <script> injected.
    return new html_webpack_plugin_1.default({
      // The file to write the HTML to.
      filename: locations.production.indexHtml,
      // The title to use for the generated HTML document.
      title: name,
      // Pass a html-minifier options object to minify the output.
      // https://github.com/kangax/html-minifier#options-quick-reference
      minify,
      // The `webpack` require path to the template.
      template: locations.template.indexHtml,
    });
  });
}
exports.default = createIndexHTMLFromAppJSONAsync;
//# sourceMappingURL=createIndexHTMLFromAppJSONAsync.js.map
