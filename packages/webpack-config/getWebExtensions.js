const { getModuleFileExtensionsWithoutDotPrefix } = require('./utils');

module.exports = function getWebExtensions() {
  return getModuleFileExtensionsWithoutDotPrefix('web');
};
