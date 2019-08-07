const path = require('path');
const chalk = require('chalk');
const getPathsAsync = require('../utils/getPathsAsync');

// Only compile files from the react ecosystem.
const includeModulesThatContainPaths = [
  /node_modules\/(@?expo|@?react-native|@react|@?unimodules|native-base|static-container).*\//,
];

const excludedRootPaths = [
  'node_modules',
  // Prevent transpiling webpack generated files.
  '(webpack)',
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
    console.log(chalk.cyan('Compiling module: ' + chalk.bold(packageName)));
  }
}

async function ensureRootAsync(possibleProjectRoot) {
  if (typeof possibleProjectRoot === 'string') {
    return path.resolve(possibleProjectRoot);
  }
  return (await getPathsAsync()).root;
}
/**
 * A complex babel loader which uses the project's `babel.config.js`
 * to resolve all of the Unimodules which are shipped as ES modules (early 2019).
 */
module.exports = async function({
  /**
   * The webpack mode: `"production" | "development"`
   */
  mode,
  babelProjectRoot,
  include = [],
  verbose,
  ...options
} = {}) {
  const ensuredProjectRoot = await ensureRootAsync(babelProjectRoot);
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
        if (inputPath.match(possibleModule)) {
          if (verbose) {
            const packageName = packageNameFromPath(inputPath);
            logPackage(packageName);
          }
          return true;
        }
      }
      // Is inside the project and is not one of designated modules
      if (inputPath.match(ensuredProjectRoot)) {
        for (const excluded of excludedRootPaths) {
          if (inputPath.match(excluded)) {
            return false;
          }
        }
        return true;
      }
      return false;
    },
    use: {
      ...customUse,
      // AFAIK there is no reason to replace `babel-loader`.
      loader: require.resolve('babel-loader'),

      options: {
        // TODO: Bacon: Caching seems to break babel
        cacheDirectory: false,
        // Explicitly use babel.config.js instead of .babelrc
        babelrc: false,
        // Attempt to use local babel.config.js file for compiling project.
        configFile: true,
        // Only clobber hard coded values.
        ...(customUseOptions || {}),
        sourceType: 'unambiguous',
        root: ensuredProjectRoot,
        // Cache babel files in production
        cacheCompression: isProduction,
        compact: isProduction,
      },
    },
  };
};
