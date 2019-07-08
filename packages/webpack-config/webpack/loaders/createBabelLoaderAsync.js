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
var __rest =
  (this && this.__rest) ||
  function(s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === 'function')
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++)
        if (e.indexOf(p[i]) < 0) t[p[i]] = s[p[i]];
    return t;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const path_1 = __importDefault(require('path'));
const chalk_1 = __importDefault(require('chalk'));
const getPathsAsync_1 = __importDefault(require('../utils/getPathsAsync'));
const getModule = name => path_1.default.join('node_modules', name);
// Only compile files from the react ecosystem.
const includeModulesThatContainPaths = [
  getModule('react-native'),
  getModule('react-navigation'),
  getModule('expo'),
  getModule('unimodules'),
  getModule('@react'),
  getModule('@expo'),
  getModule('@unimodules'),
  getModule('native-base'),
];
const parsedPackageNames = [];
// TODO: Bacon: Support internal packages. ex: react/fbjs
function packageNameFromPath(inputPath) {
  const modules = inputPath.split('node_modules/');
  const libAndFile = modules.pop();
  if (libAndFile.charAt(0) === '@') {
    const [org, lib] = libAndFile.split('/');
    return org + '/' + lib;
  } else {
    return libAndFile.split('/').shift();
  }
}
function logPackage(packageName) {
  if (!parsedPackageNames.includes(packageName)) {
    parsedPackageNames.push(packageName);
    console.log(chalk_1.default.cyan('\nCompiling module: ' + chalk_1.default.bold(packageName)));
  }
}
function ensureRootAsync(possibleProjectRoot) {
  return __awaiter(this, void 0, void 0, function*() {
    if (typeof possibleProjectRoot === 'string') {
      return path_1.default.resolve(possibleProjectRoot);
    }
    return (yield getPathsAsync_1.default()).root;
  });
}
/**
 * A complex babel loader which uses the project's `babel.config.js`
 * to resolve all of the Unimodules which are shipped as ES modules (early 2019).
 */
function createBabelLoaderAsync(_a = {}) {
  var {
      /**
       * The webpack mode: `"production" | "development"`
       */
      mode,
      babelProjectRoot,
      include = [],
      verbose,
    } = _a,
    options = __rest(_a, ['mode', 'babelProjectRoot', 'include', 'verbose']);
  return __awaiter(this, void 0, void 0, function*() {
    const ensuredProjectRoot = yield ensureRootAsync(babelProjectRoot);
    const modules = [...includeModulesThatContainPaths, ...include];
    const customUse = options.use || {};
    const customUseOptions = customUse.options || {};
    const isProduction = mode === 'production';
    return Object.assign({ test: /\.[jt]sx?$/ }, options, {
      include(inputPath) {
        for (const possibleModule of modules) {
          if (inputPath.includes(possibleModule)) {
            if (verbose) {
              const packageName = packageNameFromPath(inputPath);
              logPackage(packageName);
            }
            return inputPath;
          }
        }
        // Is inside the project and is not one of designated modules
        if (!inputPath.includes('node_modules') && inputPath.includes(ensuredProjectRoot)) {
          return inputPath;
        }
        return null;
      },
      use: Object.assign({}, customUse, {
        // AFAIK there is no reason to replace `babel-loader`.
        loader: 'babel-loader',
        options: Object.assign(
          {
            // TODO: Bacon: Caching seems to break babel
            cacheDirectory: false,
            // Explicitly use babel.config.js instead of .babelrc
            babelrc: false,
            // Attempt to use local babel.config.js file for compiling project.
            configFile: true,
            // If no babel.config.js file exists, use babel-preset-expo.
            presets: [require.resolve('babel-preset-expo')],
          },
          customUseOptions || {},
          {
            root: ensuredProjectRoot,
            // Cache babel files in production
            cacheCompression: isProduction,
            compact: isProduction,
          }
        ),
      }),
    });
  });
}
exports.default = createBabelLoaderAsync;
//# sourceMappingURL=createBabelLoaderAsync.js.map
