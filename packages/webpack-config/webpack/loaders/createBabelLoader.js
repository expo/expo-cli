const path = require('path');
const chalk = require('chalk');
const getPaths = require('../utils/getPaths');
const getModule = name => path.join('node_modules', name);

// Only compile files from the react ecosystem.
const includeModulesThatContainPaths = [
  getModule('react-native'),
  getModule('react-navigation'),
  getModule('expo'),
  getModule('unimodules'),
  getModule('@react'),
  getModule('@expo'),
  getModule('@unimodules'),
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
    console.log(chalk.cyan('\nCompiling module: ' + chalk.bold(packageName)));
  }
}

function ensureRoot(possibleProjectRoot) {
  if (typeof possibleProjectRoot === 'string') {
    return possibleProjectRoot;
  }
  return getPaths().root;
}
/**
 * A complex babel loader which uses the project's `babel.config.js`
 * to resolve all of the Unimodules which are shipped as ES modules (early 2019).
 */
module.exports = function({
  /**
   * The webpack mode: `"production" | "development"`
   */
  mode,
  babelProjectRoot,
  include = [],
  verbose,
  ...options
} = {}) {
  const ensuredProjectRoot = ensureRoot(babelProjectRoot);
  const modules = [...includeModulesThatContainPaths, ...include];
  const customUse = options.use || {};
  const customUseOptions = customUse.options || {};

  const isProduction = mode === 'production';
  return {
    test: /\.[jt]sx?$/,
    // Can only clobber test
    // Prevent clobbering the `include` and `use` values.
    ...options,

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
    use: {
      ...customUse,
      // AFAIK there is no reason to replace `babel-loader`.
      loader: 'babel-loader',

      options: {
        // TODO: Bacon: Caching seems to break babel
        cacheDirectory: false,
        // Explicitly use babel.config.js instead of .babelrc
        babelrc: false,
        // Attempt to use local babel.config.js file for compiling project.
        configFile: true,
        // If no babel.config.js file exists, use babel-preset-expo.
        presets: [require.resolve('babel-preset-expo')],
        // Only clobber hard coded values.
        ...(customUseOptions || {}),

        root: ensuredProjectRoot,
        // Cache babel files in production
        cacheCompression: isProduction,
        compact: isProduction,
      },
    },
  };
};
