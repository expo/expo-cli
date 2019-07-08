import { getConfigForPWA, ExpoConfig } from '@expo/config';
import getPathsAsync from './getPathsAsync';
import { Environment } from '../types';

async function getConfigAsync(env: Environment): Promise<ExpoConfig> {
  if (env.config) {
    return env.config;
  }
  const locations = await getPathsAsync(env);
  // Fill all config values with PWA defaults
  return getConfigForPWA(env.projectRoot, locations.absolute, {
    templateIcon: locations.template.get('icon.png'),
  });
}

export default getConfigAsync;
