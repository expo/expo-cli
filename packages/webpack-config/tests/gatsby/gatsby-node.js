// const withUnimodules = require('@expo/webpack-config/withUnimodules')
const withUnimodules = require('../../withUnimodules');

exports.onCreateWebpackConfig = ({ actions, loaders, getConfig }) => {
  actions.replaceWebpackConfig(
    withUnimodules(getConfig(), { projectRoot: __dirname }, { supportsFontLoading: false })
  );
};
