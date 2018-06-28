/**
 * @flow
 */

import { expoSdkUniversalModulesConfigs } from './config';

type Platform = 'ios' | 'android';

type ModuleConfig = {
  podName: string,
  libName: string,
  detachable: boolean,
  subdirectory: string,
  versionable: boolean,
};

function mapForPlatform(platform: Platform): () => ModuleConfig {
  return moduleConfig => ({ ...moduleConfig, ...moduleConfig.config[platform] });
}

export function getAllForPlatform(platform: Platform): Array<ModuleConfig> {
  return expoSdkUniversalModulesConfigs.map(mapForPlatform(platform));
}

export function getVersionableModulesForPlatform(platform: Platform): Array<ModuleConfig> {
  return getAllForPlatform(platform).filter(moduleConfig => moduleConfig.versionable);
}

export function getDetachableModulesForPlatform(platform: Platform): Array<ModuleConfig> {
  return getAllForPlatform(platform).filter(moduleConfig => moduleConfig.detachable);
}
