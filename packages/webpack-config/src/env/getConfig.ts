import { ExpoConfig, getConfigForPWA } from '@expo/config';

import { Environment } from '../types';
import { getPaths } from './paths';

function getConfig(env: Pick<Environment, 'config' | 'locations' | 'projectRoot'>): ExpoConfig {
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
