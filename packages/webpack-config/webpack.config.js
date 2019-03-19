const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');

module.exports = function(env = {}, argv) {
  if (env.development) {
    return developmentConfig(env, argv);
  } else {
    return productionConfig(env, argv);
  }
};
