const getConfig = require('./webpack/utils/getConfig');
const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');
const getMode = require('./webpack/utils/getMode');
const Diagnosis = require('./webpack/utils/Diagnosis');

module.exports = function(env = {}, argv) {
  // Fill all config values with PWA defaults
  if (!env.config) {
    env.config = getConfig(env);
  }

  const mode = getMode(env);
  let config;
  if (mode === 'development') {
    config = developmentConfig(env, argv);
  } else {
    config = productionConfig(env, argv);
  }

  if (env.info) {
    Diagnosis.reportAsync(config, env);
  }

  return config;
};
