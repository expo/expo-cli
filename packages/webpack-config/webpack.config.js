const developmentConfig = require('./webpack/webpack.dev');
const productionConfig = require('./webpack/webpack.prod');
const fs = require('fs');
const path = require('path');

function invokePossibleFunction(objectOrMethod, ...args) {
  if (typeof objectOrMethod === 'function') {
    return objectOrMethod(...args);
  } else {
    return objectOrMethod;
  }
}

module.exports = function(env, argv) {
  // Check if the project has a webpack.config.js in the root.
  const projectWebpackConfig = path.resolve(process.cwd(), 'webpack.config.js');
  if (fs.existsSync(projectWebpackConfig)) {
    const webpackConfig = require(projectWebpackConfig);
    return invokePossibleFunction(webpackConfig, env, argv);
  }

  const getConfigFromRootIfPossible = filename => {
    const overridePath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(overridePath)) {
      return require(overridePath);
    } else {
      return require(path.join(__dirname, 'webpack', filename));
    }
  };

  if (env.development) {
    const config = getConfigFromRootIfPossible('webpack.dev.js');
    return invokePossibleFunction(config, env, argv);
  } else {
    const config = getConfigFromRootIfPossible('webpack.prod.js');
    return invokePossibleFunction(config, env, argv);
  }
};
