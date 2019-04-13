const path = require('path');
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

module.exports = function(env, babelRoot, { pathsToInclude = [], ...options } = {}) {
  const modules = [...includeModulesThatContainPaths, ...pathsToInclude];
  return {
    test: /\.[jt]sx?$/,
    include(inputPath) {
      for (const option of modules) {
        if (inputPath.includes(option)) {
          return inputPath;
        }
      }
      // Is inside the project and is not one of designated modules
      if (!inputPath.includes('node_modules') && inputPath.includes(babelRoot)) {
        return inputPath;
      }
      return null;
    },
    use: {
      loader: 'babel-loader',
      options: {
        cacheDirectory: false,
        babelrc: false,
        configFile: true,
        root: babelRoot,
        cacheCompression: env.production,
        compact: env.production,
      },
    },
    ...options,
  };
};
