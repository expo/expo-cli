// Only compile files from the react ecosystem.
const includeModulesThatContainPaths = [
  'node_modules/react-native',
  'node_modules/react-navigation',
  'node_modules/expo',
  'node_modules/unimodules',
  'node_modules/@react',
  'node_modules/@expo',
  'node_modules/@unimodules',
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
