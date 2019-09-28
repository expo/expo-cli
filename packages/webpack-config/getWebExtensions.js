const { getModuleFileExtensionsWithoutDotPrefix } = require('./webpack/utils/config');

module.exports = function getWebExtensions() {
  return getModuleFileExtensionsWithoutDotPrefix('web');
};
