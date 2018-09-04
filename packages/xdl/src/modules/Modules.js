/**
 * @flow
 */

import semver from 'semver';

import { expoSdkUniversalModulesConfigs } from './config';

type Platform = 'ios' | 'android';

type ModuleConfig = {
  podName: string,
  libName: string,
  sdkVersions: string,
  detachable: boolean,
  isNativeModule: boolean,
  subdirectory: string,
  versionable: boolean,
  includeInExpoClient: boolean,
};

function mapForPlatform(platform: Platform): () => ModuleConfig {
  return moduleConfig => ({ ...moduleConfig, ...moduleConfig.config[platform] });
}

export function getAllForPlatform(platform: Platform): Array<ModuleConfig> {
  return expoSdkUniversalModulesConfigs.map(mapForPlatform(platform));
}

export function getAllNativeForExpoClientOnPlatform(platform: Platform): Array<ModuleConfig> {
  return getAllForPlatform(platform).filter(
    moduleConfig => moduleConfig.includeInExpoClient && moduleConfig.isNativeModule
  );
}

export function getVersionableModulesForPlatform(platform: Platform): Array<ModuleConfig> {
  return getAllNativeForExpoClientOnPlatform(platform).filter(moduleConfig => {
    return moduleConfig.versionable;
  });
}

export function getDetachableModulesForPlatformAndSdkVersion(
  platform: Platform,
  sdkVersion: string
): Array<ModuleConfig> {
  return getAllForPlatform(platform).filter(moduleConfig => {
    return (
      moduleConfig.isNativeModule &&
      moduleConfig.detachable &&
      semver.satisfies(sdkVersion, moduleConfig.sdkVersions)
    );
  });
}

export function getPublishableModules(): Array<ModuleConfig> {
  return expoSdkUniversalModulesConfigs.filter(moduleConfig => !!moduleConfig.libName);
}
