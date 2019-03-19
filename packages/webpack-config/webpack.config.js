const fs = require('fs');
const path = require('path');
const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');

function invokePossibleFunction(objectOrMethod, ...args) {
  if (typeof objectOrMethod === 'function') {
    return objectOrMethod(...args);
  } else {
    return objectOrMethod;
  }
}

function getConfigFromRootIfPossible(filename) {
  const overridePath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(overridePath)) {
    return require(overridePath);
  } else {
    return require(path.join(__dirname, 'webpack', filename));
  }
}

module.exports = function(env = {}, argv) {
  if (env.development) {
    const config = getConfigFromRootIfPossible('webpack.dev.js');
    return invokePossibleFunction(config, env, argv);
  } else {
    const config = getConfigFromRootIfPossible('webpack.prod.js');
    return invokePossibleFunction(config, env, argv);
  }
};
