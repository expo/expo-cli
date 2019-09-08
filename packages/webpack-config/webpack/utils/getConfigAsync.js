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
const config_1 = require('@expo/config');
const getPathsAsync_1 = __importDefault(require('./getPathsAsync'));
function getConfigAsync(env) {
  return __awaiter(this, void 0, void 0, function*() {
    if (env.config) {
      return env.config;
    }
    const locations = yield getPathsAsync_1.default(env);
    // Fill all config values with PWA defaults
    return config_1.getConfigForPWA(env.projectRoot, locations.absolute, {
      templateIcon: locations.template.get('icon.png'),
    });
  });
}
exports.default = getConfigAsync;
//# sourceMappingURL=getConfigAsync.js.map
