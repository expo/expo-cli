const { getConfigForPWA } = require('@expo/config');
const getLocations = require('./webpackLocations');

module.exports = function(env) {
  const locations = getLocations(env.projectRoot);
  // Fill all config values with PWA defaults
  return getConfigForPWA(env.projectRoot, locations.absolute, {
    templateIcon: locations.template.get('icon.png'),
  });
};
