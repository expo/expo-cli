const createExpoWebpackConfig = require('@expo/webpack-config');

module.exports = function(env, argv) {
  const config = createExpoWebpackConfig(env, argv);
  // Customize the config before returning it.
  return config;
};
