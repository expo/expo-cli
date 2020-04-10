const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  // disable service worker
  const config = await createExpoWebpackConfigAsync({ ...env, offline: false }, argv);

  return config;
};
