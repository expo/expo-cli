const configUtil = require('./webpack/utils/config');

module.exports = function getWebPageExtensions() {
  return configUtil.getModuleFileExtensionsWithoutDotPrefix('web');
};
