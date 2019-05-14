/**
 * @flow
 */

import semver from 'semver';

import { expoSdkUniversalModulesConfigs, vendoredNativeModules } from './config';

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

const HIGHEST_KNOWN_VERSION = '10000.0.0';

export function getAllNativeModules() {
  return [...expoSdkUniversalModulesConfigs, ...vendoredNativeModules].filter(
    moduleConfig => moduleConfig.isNativeModule
  );
}

function mapForPlatform(platform: Platform): () => ModuleConfig {
  return moduleConfig => ({ ...moduleConfig, ...moduleConfig.config[platform] });
}

export function getAllForPlatform(platform: Platform, sdkVersion: string): Array<ModuleConfig> {
  return expoSdkUniversalModulesConfigs
    .filter(moduleConfig => doesVersionSatisfy(sdkVersion, moduleConfig.sdkVersions))
    .map(mapForPlatform(platform));
}

export function getAllNativeForExpoClientOnPlatform(
  platform: Platform,
  sdkVersion: string
): Array<ModuleConfig> {
  return getAllForPlatform(platform, sdkVersion).filter(
    moduleConfig => moduleConfig.includeInExpoClient && moduleConfig.isNativeModule
  );
}

export function getVersionableModulesForPlatform(
  platform: Platform,
  sdkVersion: string
): Array<ModuleConfig> {
  return getAllNativeForExpoClientOnPlatform(platform, sdkVersion).filter(moduleConfig => {
    return moduleConfig.versionable;
  });
}

export function getDetachableModules(platform: Platform, sdkVersion: string): Array<ModuleConfig> {
  return getAllForPlatform(platform, sdkVersion).filter(
    moduleConfig => moduleConfig.isNativeModule && moduleConfig.detachable
  );
}

export function getPublishableModules(sdkVersion: string): Array<ModuleConfig> {
  return expoSdkUniversalModulesConfigs.filter(
    moduleConfig =>
      !!moduleConfig.libName && doesVersionSatisfy(sdkVersion, moduleConfig.sdkVersions)
  );
}

export function doesVersionSatisfy(version: string, versionRequirement: string): boolean {
  if (version === 'UNVERSIONED') {
    return semver.satisfies(HIGHEST_KNOWN_VERSION, versionRequirement);
  }

  return semver.satisfies(version, versionRequirement);
}
