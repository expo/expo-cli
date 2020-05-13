const transformer = require('metro-react-native-babel-transformer');

exports.getCacheKey = transformer.getCacheKey;

exports.transform = function ({ filename, options, src, plugins }) {
  return transformer.transform({
    filename,
    options: Object.assign({}, options, {
      extendsBabelConfigPath: require.resolve('babel-preset-expo'),
    }),
    src,
    plugins,
  });
};
