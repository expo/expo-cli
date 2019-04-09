const path = require('path');
const module = name => path.join('node_modules', name);

// Only compile files from the react ecosystem.
const includeModulesThatContainPaths = [
  module('react-native'),
  module('react-navigation'),
  module('expo'),
  module('unimodules'),
  module('@react'),
  module('@expo'),
  module('@unimodules'),
];

module.exports = function(babelRoot, { pathsToInclude = [], ...options } = {}) {
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
        root: babelRoot,
      },
    },
    ...options,
  };
};
