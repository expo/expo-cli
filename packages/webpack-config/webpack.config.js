const getConfigAsync = require('./webpack/utils/getConfigAsync');
const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');
const getMode = require('./webpack/utils/getMode');
const Diagnosis = require('./webpack/utils/Diagnosis');

module.exports = async function(env = {}, argv) {
  // Fill all config values with PWA defaults
  if (!env.config) {
    env.config = await getConfigAsync(env);
  }

  const mode = getMode(env);
  let config;
  if (mode === 'development') {
    config = await developmentConfig(env, argv);
  } else {
    config = await productionConfig(env, argv);
  }

  if (env.info) {
    Diagnosis.reportAsync(config, env);
  }

  return config;
};
