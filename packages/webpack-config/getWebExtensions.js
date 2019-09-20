const configUtil = require('./webpack/utils/config');

module.exports = function getWebExtensions() {
  return configUtil.getModuleFileExtensionsWithoutDotPrefix('web');
};
