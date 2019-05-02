const { getConfigForPWA } = require('@expo/config');
const { getPathsAsync } = require('./PathUtils');

async function getConfigAsync(env) {
  if (env.config) {
    return env.config;
  }
  const locations = await getPathsAsync(env);
  // Fill all config values with PWA defaults
  return getConfigForPWA(env.projectRoot, locations.absolute, {
    templateIcon: locations.template.get('icon.png'),
  });
}

module.exports = getConfigAsync;
