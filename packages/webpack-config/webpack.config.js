const getConfigAsync = require('./webpack/utils/getConfigAsync');
const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');
const getMode = require('./webpack/utils/getMode');

module.exports = async function(env = {}, argv) {
  // Fill all config values with PWA defaults
  if (!env.config) {
    env.config = await getConfigAsync(env);
  }

  const mode = getMode(env);

  if (mode === 'development') {
    return await developmentConfig(env, argv);
  } else {
    return await productionConfig(env, argv);
  }
};
