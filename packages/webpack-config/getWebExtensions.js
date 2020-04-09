const { getBareExtensions } = require('@expo/config/paths');

module.exports = function getWebExtensions() {
  return getBareExtensions(['web']);
};
