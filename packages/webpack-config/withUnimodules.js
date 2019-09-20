const path = require('path');
const merge = require('webpack-merge');
const webpackConfig = require('./webpack/webpack.config.unimodules').default;

function _findBabelLoader(rules) {
  for (const rule of rules) {
    if (rule.use && rule.use.loader && rule.use.loader.includes('/babel-loader')) {
      return rule;
    }
  }
  return null;
}

// Wrap your existing webpack config with support for Unimodules.
// ex: Storybook `({ config }) => withUnimodules(config)`
module.exports = function withUnimodules(inputWebpackConfig = {}, env = {}, argv = {}) {
  const expoConfig = webpackConfig(
    {
      // Attempt to use the input webpack config mode
      mode: inputWebpackConfig.mode,
      ...env,
    },
    argv
  );

  const expoBabelLoader = _findBabelLoader(expoConfig.module.rules);
  const includeFunc = expoBabelLoader.include;

  // We have to transpile these modules and make them not external too.
  // We have to do this because next.js by default externals all `node_modules`'s js files.
  // Reference:
  // https://github.com/martpie/next-transpile-modules/blob/77450a0c0307e4b650d7acfbc18641ef9465f0da/index.js#L48-L62
  // https://github.com/zeit/next.js/blob/0b496a45e85f3c9aa3cf2e77eef10888be5884fc/packages/next/build/webpack-config.ts#L185-L258
  if (inputWebpackConfig.externals) {
    inputWebpackConfig.externals = inputWebpackConfig.externals.map(external => {
      if (typeof external !== 'function') return external;
      return (ctx, req, cb) => {
        return includeFunc(path.join('node_modules', req)) ? cb() : external(ctx, req, cb);
      };
    });
  }
  return merge(expoConfig, inputWebpackConfig);
};
