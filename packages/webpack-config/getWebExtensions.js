const { getBareExtensions } = require('./webpack/env/extensions');

module.exports = function getWebExtensions() {
  return getBareExtensions(['web']);
};
