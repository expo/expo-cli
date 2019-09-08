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
const getPathsAsync_1 = __importDefault(require('../getPathsAsync'));
const normalizePaths_1 = __importDefault(require('../normalizePaths'));
const projectRoot = path_1.default.resolve(__dirname, '../../../tests/basic');
const projectRootCustomHomepage = path_1.default.resolve(
  __dirname,
  '../../../tests/custom-homepage'
);
function defaultNormalize(locations) {
  return normalizePaths_1.default(locations, value =>
    value.split('packages/webpack-config/').pop()
  );
}
beforeEach(() => {
  delete process.env.WEB_PUBLIC_URL;
});
it(`has consistent defaults`, () =>
  __awaiter(this, void 0, void 0, function*() {
    const locations = yield getPathsAsync_1.default({ projectRoot });
    const normalized = defaultNormalize(locations);
    expect(normalized).toMatchSnapshot();
    expect(locations.servedPath).toBe('/');
  }));
it(`uses a custom public path from WEB_PUBLIC_URL over the homepage field from package.json`, () =>
  __awaiter(this, void 0, void 0, function*() {
    process.env.WEB_PUBLIC_URL = 'WEB_PUBLIC_URL-defined';
    const locations = yield getPathsAsync_1.default({ projectRoot: projectRootCustomHomepage });
    expect(locations.servedPath).toBe('WEB_PUBLIC_URL-defined/');
  }));
it(`uses a custom public path from the homepage field of a project's package.json`, () =>
  __awaiter(this, void 0, void 0, function*() {
    const locations = yield getPathsAsync_1.default({ projectRoot: projectRootCustomHomepage });
    expect(locations.servedPath).toMatchSnapshot();
  }));
// TODO: Bacon: Add test for resolving entry point
// TODO: Bacon: Add test for custom config paths
//# sourceMappingURL=getPathsAsync-test.js.map
