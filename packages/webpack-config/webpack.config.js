const getConfig = require('./webpack/utils/getConfig');
const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');
const getMode = require('./webpack/utils/getMode');

module.exports = function(env = {}, argv) {
  // Fill all config values with PWA defaults
  if (!env.config) {
    env.config = getConfig(env);
  }

  const mode = getMode(env);

  if (mode === 'development') {
    return developmentConfig(env, argv);
  } else {
    return productionConfig(env, argv);
  }
};
