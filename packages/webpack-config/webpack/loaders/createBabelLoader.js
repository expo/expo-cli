const path = require('path');
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
  pathsToInclude = [],
  ...options
} = {}) {
  const ensuredProjectRoot = ensureRoot(babelProjectRoot);
  const modules = [...includeModulesThatContainPaths, ...pathsToInclude];
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
        configFile: true,

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
