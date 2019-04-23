const { getConfigForPWA } = require('@expo/config');
const getPaths = require('./getPaths');

module.exports = function(env) {
  if (env.config) {
    return env.config;
  }
  const locations = getPaths(env);
  // Fill all config values with PWA defaults
  return getConfigForPWA(env.projectRoot, locations.absolute, {
    templateIcon: locations.template.get('icon.png'),
  });
};
