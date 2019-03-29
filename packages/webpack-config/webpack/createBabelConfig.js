const path = require('path');

// Only compile files from the react ecosystem.
const includeModulesThatContainPaths = [
  path.join('node_modules', 'react-native'),
  path.join('node_modules', 'react-navigation'),
  path.join('node_modules', 'expo'),
  path.join('node_modules', 'unimodules'),
  path.join('node_modules', '@react'),
  path.join('node_modules', '@expo'),
  path.join('node_modules', '@unimodules'),
];

module.exports = function(babelRoot, { pathsToInclude = [], ...options } = {}) {
  const modules = [...includeModulesThatContainPaths, ...pathsToInclude];
  return {
    test: /\.jsx?$/,
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
