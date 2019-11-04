const { getManagedExtensions } = require('@expo/config/build/paths');

module.exports = function getWebExtensions() {
  return getManagedExtensions(['web']);
};
