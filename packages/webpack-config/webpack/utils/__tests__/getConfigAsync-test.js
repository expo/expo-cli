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
const getConfigAsync_1 = __importDefault(require('../getConfigAsync'));
const normalizePaths_1 = __importDefault(require('../normalizePaths'));
const projectRoot = path_1.default.resolve(__dirname, '../../../tests/basic');
const mode = 'development';
const env = { projectRoot, mode };
it(`has consistent defaults`, () =>
  __awaiter(this, void 0, void 0, function*() {
    const config = yield getConfigAsync_1.default(env);
    const normalized = normalizePaths_1.default(config, value =>
      value.split('packages/webpack-config/').pop()
    );
    expect(normalized).toMatchSnapshot();
  }));
//# sourceMappingURL=getConfigAsync-test.js.map
