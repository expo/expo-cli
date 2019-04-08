const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');
const getLocations = require('./webpackLocations');
const createBabelConfig = require('./createBabelConfig');
const { getConfigForPWA } = require('@expo/config');

module.exports = function(env = {}, argv) {
  const locations = getLocations(env.projectRoot);
  const babelConfig = createBabelConfig(locations.root);
  env.babelConfig = babelConfig;
  // Fill all config values with PWA defaults
  env.config = getConfigForPWA(env.projectRoot, locations.get, {
    templateIcon: locations.template.get('icon.png'),
  });

  if (env.development) {
    return developmentConfig(env, argv);
  } else {
    return productionConfig(env, argv);
  }
};
