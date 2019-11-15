const { getManagedExtensions } = require('@expo/config/paths');

module.exports = function getWebExtensions() {
  return getManagedExtensions(['web']);
};
