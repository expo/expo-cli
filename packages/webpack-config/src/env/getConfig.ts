import { ExpoConfig } from '@expo/config';
import { getConfigForPWA } from 'expo-pwa';

import { Environment } from '../types';

/**
 * Get the Expo project config in a way that's optimized for web.
 *
 * @param env Environment properties used for getting the Expo project config.
 * @category env
 */
function getConfig(env: Pick<Environment, 'projectRoot' | 'config'>): ExpoConfig {
  if (env.config) {
    return env.config;
  }
  // Fill all config values with PWA defaults
  return getConfigForPWA(env.projectRoot);
}

export default getConfig;
