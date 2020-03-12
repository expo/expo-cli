import { ExpoConfig, getConfigForPWA } from '@expo/config';

import { Environment } from '../types';
import { getPaths } from './paths';

/**
 * Get the Expo project config in a way that's optimized for web.
 *
 * @param env Environment properties used for getting the Expo project config.
 * @category env
 */
function getConfig(env: Pick<Environment, 'projectRoot' | 'config' | 'locations'>): ExpoConfig {
  if (env.config) {
    return env.config;
  }
  const locations = env.locations || getPaths(env.projectRoot);
  // Fill all config values with PWA defaults
  return getConfigForPWA(env.projectRoot, locations.absolute, {
    templateIcon: locations.template.get('icon.png'),
  });
}

export default getConfig;
