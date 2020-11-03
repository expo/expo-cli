import path from 'path';
import xcode from 'xcode';

import { ExpoConfig } from '../Config.types';
import { projectHasModule } from '../Modules';
import { ExportedConfig } from '../Plugin.types';
import { withExpoPlist } from '../plugins/ios-plugins';
import { ExpoPlist } from './IosConfig.types';

export enum Config {
  ENABLED = 'EXUpdatesEnabled',
  CHECK_ON_LAUNCH = 'EXUpdatesCheckOnLaunch',
  LAUNCH_WAIT_MS = 'EXUpdatesLaunchWaitMs',
  RUNTIME_VERSION = 'EXUpdatesRuntimeVersion',
  SDK_VERSION = 'EXUpdatesSDKVersion',
  UPDATE_URL = 'EXUpdatesURL',
}

export function getUpdateUrl(config: ExpoConfig, username: string | null): string | null {
  const user = typeof config.owner === 'string' ? config.owner : username;
  if (!user) {
    return null;
  }
  return `https://exp.host/@${user}/${config.slug}`;
}

export function getRuntimeVersion(config: ExpoConfig): string | null {
  return typeof config.runtimeVersion === 'string' ? config.runtimeVersion : null;
}

export function getSDKVersion(config: ExpoConfig): string | null {
  return typeof config.sdkVersion === 'string' ? config.sdkVersion : null;
}

export function getUpdatesEnabled(config: ExpoConfig): boolean {
  return config.updates?.enabled !== false;
}

export function getUpdatesTimeout(config: ExpoConfig) {
  return config.updates?.fallbackToCacheTimeout ?? 0;
}

export function getUpdatesCheckOnLaunch(config: ExpoConfig): 'NEVER' | 'ALWAYS' {
  if (config.updates?.checkAutomatically === 'ON_ERROR_RECOVERY') {
    return 'NEVER';
  } else if (config.updates?.checkAutomatically === 'ON_LOAD') {
    return 'ALWAYS';
  }
  return 'ALWAYS';
}

export const withUpdates = (
  config: ExportedConfig,
  { expoUsername }: { expoUsername: string | null }
) => {
  return withExpoPlist(config, config => {
    config.modResults = setUpdatesConfig(config, config.modResults, expoUsername);
    return config;
  });
};

export function setUpdatesConfig(
  config: ExpoConfig,
  expoPlist: ExpoPlist,
  username: string | null
): ExpoPlist {
  const newExpoPlist = {
    ...expoPlist,
    [Config.ENABLED]: getUpdatesEnabled(config),
    [Config.CHECK_ON_LAUNCH]: getUpdatesCheckOnLaunch(config),
    [Config.LAUNCH_WAIT_MS]: getUpdatesTimeout(config),
  };

  const updateUrl = getUpdateUrl(config, username);
  if (updateUrl) {
    newExpoPlist[Config.UPDATE_URL] = updateUrl;
  } else {
    delete newExpoPlist[Config.UPDATE_URL];
  }

  return setVersionsConfig(config, newExpoPlist);
}

export function setVersionsConfig(config: ExpoConfig, expoPlist: ExpoPlist): ExpoPlist {
  const newExpoPlist = { ...expoPlist };

  const runtimeVersion = getRuntimeVersion(config);
  const sdkVersion = getSDKVersion(config);
  if (runtimeVersion) {
    delete newExpoPlist[Config.SDK_VERSION];
    newExpoPlist[Config.RUNTIME_VERSION] = runtimeVersion;
  } else if (sdkVersion) {
    delete newExpoPlist[Config.RUNTIME_VERSION];
    newExpoPlist[Config.SDK_VERSION] = sdkVersion;
  } else {
    delete newExpoPlist[Config.SDK_VERSION];
    delete newExpoPlist[Config.RUNTIME_VERSION];
  }

  return newExpoPlist;
}

function formatConfigurationScriptPath(projectDir: string, config: ExpoConfig): string {
  const buildScriptPath = projectHasModule(
    'expo-updates/scripts/create-manifest-ios.sh',
    projectDir,
    config
  );

  if (!buildScriptPath) {
    throw new Error(
      "Could not find the build script for iOS. This could happen in case of outdated 'node_modules'. Run 'npm install' to make sure that it's up-to-date."
    );
  }

  return path.relative(path.join(projectDir, 'ios'), buildScriptPath);
}

interface ShellScriptBuildPhase {
  isa: 'PBXShellScriptBuildPhase';
  name: string;
  shellScript: string;
  [key: string]: any;
}

function getBundleReactNativePhase(project: xcode.XcodeProject): ShellScriptBuildPhase {
  const shellScriptBuildPhase = project.hash.project.objects.PBXShellScriptBuildPhase as Record<
    string,
    ShellScriptBuildPhase
  >;
  const bundleReactNative = Object.values(shellScriptBuildPhase).find(
    buildPhase => buildPhase.name === '"Bundle React Native code and images"'
  );

  if (!bundleReactNative) {
    throw new Error(`Couldn't find a build phase "Bundle React Native code and images"`);
  }

  return bundleReactNative;
}

export function ensureBundleReactNativePhaseContainsConfigurationScript(
  projectDir: string,
  config: ExpoConfig,
  project: xcode.XcodeProject
): xcode.XcodeProject {
  const bundleReactNative = getBundleReactNativePhase(project);
  const buildPhaseShellScriptPath = formatConfigurationScriptPath(projectDir, config);

  if (!bundleReactNative.shellScript.includes(buildPhaseShellScriptPath)) {
    bundleReactNative.shellScript = `${bundleReactNative.shellScript.replace(
      /"$/,
      ''
    )}${buildPhaseShellScriptPath}\\n"`;
  }
  return project;
}

export function isShellScriptBuildPhaseConfigured(
  projectDir: string,
  config: ExpoConfig,
  project: xcode.XcodeProject
): boolean {
  const bundleReactNative = getBundleReactNativePhase(project);
  const buildPhaseShellScriptPath = formatConfigurationScriptPath(projectDir, config);
  return bundleReactNative.shellScript.includes(buildPhaseShellScriptPath);
}

export function isPlistConfigurationSet(expoPlist: ExpoPlist): boolean {
  return Boolean(
    expoPlist.EXUpdatesURL && (expoPlist.EXUpdatesSDKVersion || expoPlist.EXUpdatesRuntimeVersion)
  );
}

export function isPlistConfigurationSynced(
  config: ExpoConfig,
  expoPlist: ExpoPlist,
  username: string | null
): boolean {
  return (
    getUpdateUrl(config, username) === expoPlist.EXUpdatesURL &&
    getUpdatesEnabled(config) === expoPlist.EXUpdatesEnabled &&
    getUpdatesTimeout(config) === expoPlist.EXUpdatesLaunchWaitMs &&
    getUpdatesCheckOnLaunch(config) === expoPlist.EXUpdatesCheckOnLaunch &&
    isPlistVersionConfigurationSynced(config, expoPlist)
  );
}

export function isPlistVersionConfigurationSynced(
  config: ExpoConfig,
  expoPlist: ExpoPlist
): boolean {
  const expectedRuntimeVersion = getRuntimeVersion(config);
  const expectedSdkVersion = getSDKVersion(config);
  const currentRuntimeVersion = expoPlist.EXUpdatesRuntimeVersion ?? null;
  const currentSdkVersion = expoPlist.EXUpdatesSDKVersion ?? null;

  return (
    currentSdkVersion === expectedSdkVersion || currentRuntimeVersion === expectedRuntimeVersion
  );
}
