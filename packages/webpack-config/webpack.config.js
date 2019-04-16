const getConfig = require('./webpack/getConfig');
const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');

module.exports = function(env = {}, argv) {
  // Fill all config values with PWA defaults
  env.config = getConfig(env);

  if (env.development) {
    return developmentConfig(env, argv);
  } else {
    return productionConfig(env, argv);
  }
};
