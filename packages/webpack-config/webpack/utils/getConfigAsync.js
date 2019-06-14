const { getConfigForPWA } = require('@expo/config');
const getPathsAsync = require('./getPathsAsync');

module.exports = async function(env) {
  if (env.config) {
    return env.config;
  }
  const locations = await getPathsAsync(env);
  // Fill all config values with PWA defaults
  return getConfigForPWA(env.projectRoot, locations.absolute, {
    templateIcon: locations.template.get('icon.png'),
  });
};
