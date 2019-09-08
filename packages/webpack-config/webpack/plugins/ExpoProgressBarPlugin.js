'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const chalk_1 = __importDefault(require('chalk'));
// @ts-ignore
const progress_bar_webpack_plugin_1 = __importDefault(require('progress-bar-webpack-plugin'));
// @ts-ignore
class ExpoProgressBarPlugin extends progress_bar_webpack_plugin_1.default {
  constructor() {
    super({
      format: `[:bar] ${chalk_1.default.green.bold(':percent')} (:elapsed seconds)`,
      clear: false,
      complete: '=',
      incomplete: ' ',
      summary: false,
    });
  }
}
exports.default = ExpoProgressBarPlugin;
//# sourceMappingURL=ExpoProgressBarPlugin.js.map
