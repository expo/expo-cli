const createExpoWebpackConfig = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfig(env, argv);
  // Customize the config before returning it.
  return config;
};
