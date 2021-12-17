import * as path from 'path';
import resolveFrom from 'resolve-from';
import semver from 'semver';
import xcode from 'xcode';

import { ConfigPlugin } from '../Plugin.types';
import { withExpoPlist } from '../plugins/ios-plugins';
import {
  ExpoConfigUpdates,
  getExpoUpdatesPackageVersion,
  getRuntimeVersionNullable,
  getUpdateUrl,
} from '../utils/Updates';
import { ExpoPlist } from './IosConfig.types';

const CREATE_MANIFEST_IOS_PATH = 'expo-updates/scripts/create-manifest-ios.sh';

export enum Config {
  ENABLED = 'EXUpdatesEnabled',
  CHECK_ON_LAUNCH = 'EXUpdatesCheckOnLaunch',
  LAUNCH_WAIT_MS = 'EXUpdatesLaunchWaitMs',
  RUNTIME_VERSION = 'EXUpdatesRuntimeVersion',
  SDK_VERSION = 'EXUpdatesSDKVersion',
  UPDATE_URL = 'EXUpdatesURL',
  RELEASE_CHANNEL = 'EXUpdatesReleaseChannel',
  UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY = 'EXUpdatesRequestHeaders',
}

export function getSDKVersion(config: Pick<ExpoConfigUpdates, 'sdkVersion'>): string | null {
  return typeof config.sdkVersion === 'string' ? config.sdkVersion : null;
}

export function getUpdatesEnabled(config: Pick<ExpoConfigUpdates, 'updates'>): boolean {
  return config.updates?.enabled !== false;
}

export function getUpdatesTimeout(config: Pick<ExpoConfigUpdates, 'updates'>) {
  return config.updates?.fallbackToCacheTimeout ?? 0;
}

export function getUpdatesCheckOnLaunch(
  config: Pick<ExpoConfigUpdates, 'updates'>,
  expoUpdatesPackageVersion?: string | null
): 'NEVER' | 'ERROR_RECOVERY_ONLY' | 'ALWAYS' {
  if (config.updates?.checkAutomatically === 'ON_ERROR_RECOVERY') {
    // native 'ERROR_RECOVERY_ONLY' option was only introduced in 0.11.x
    if (expoUpdatesPackageVersion && semver.gte(expoUpdatesPackageVersion, '0.11.0')) {
      return 'ERROR_RECOVERY_ONLY';
    }
    return 'NEVER';
  } else if (config.updates?.checkAutomatically === 'ON_LOAD') {
    return 'ALWAYS';
  }
  return 'ALWAYS';
}

export const withUpdates: ConfigPlugin<{ expoUsername: string | null }> = (
  config,
  { expoUsername }
) => {
  return withExpoPlist(config, config => {
    const expoUpdatesPackageVersion = getExpoUpdatesPackageVersion(config.modRequest.projectRoot);
    config.modResults = setUpdatesConfig(
      config,
      config.modResults,
      expoUsername,
      expoUpdatesPackageVersion
    );
    return config;
  });
};

export function setUpdatesConfig(
  config: ExpoConfigUpdates,
  expoPlist: ExpoPlist,
  username: string | null,
  expoUpdatesPackageVersion?: string | null
): ExpoPlist {
  const newExpoPlist = {
    ...expoPlist,
    [Config.ENABLED]: getUpdatesEnabled(config),
    [Config.CHECK_ON_LAUNCH]: getUpdatesCheckOnLaunch(config, expoUpdatesPackageVersion),
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

export function setVersionsConfig(config: ExpoConfigUpdates, expoPlist: ExpoPlist): ExpoPlist {
  const newExpoPlist = { ...expoPlist };

  const runtimeVersion = getRuntimeVersionNullable(config, 'ios');
  if (!runtimeVersion && expoPlist[Config.RUNTIME_VERSION]) {
    throw new Error(
      'A runtime version is set in your Expo.plist, but is missing from your app.json/app.config.js. Please either set runtimeVersion in your app.json/app.config.js or remove EXUpdatesRuntimeVersion from your Expo.plist.'
    );
  }

  if (runtimeVersion) {
    delete newExpoPlist[Config.SDK_VERSION];
    newExpoPlist[Config.RUNTIME_VERSION] = runtimeVersion;
  } else {
    /**
     * runtime version maybe null in projects using classic updates. In that
     * case we use SDK version
     */
    const sdkVersion = getSDKVersion(config);
    if (!sdkVersion) {
      throw new Error('Either a runtime or SDK version must be set in an Expo project.');
    }
    newExpoPlist[Config.SDK_VERSION] = sdkVersion;
  }

  return newExpoPlist;
}

function formatConfigurationScriptPath(projectRoot: string): string {
  const buildScriptPath = resolveFrom.silent(projectRoot, CREATE_MANIFEST_IOS_PATH);

  if (!buildScriptPath) {
    throw new Error(
      "Could not find the build script for iOS. This could happen in case of outdated 'node_modules'. Run 'npm install' to make sure that it's up-to-date."
    );
  }

  const relativePath = path.relative(path.join(projectRoot, 'ios'), buildScriptPath);
  return process.platform === 'win32' ? relativePath.replace(/\\/g, '/') : relativePath;
}

interface ShellScriptBuildPhase {
  isa: 'PBXShellScriptBuildPhase';
  name: string;
  shellScript: string;
  [key: string]: any;
}

export function getBundleReactNativePhase(project: xcode.XcodeProject): ShellScriptBuildPhase {
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
  projectRoot: string,
  project: xcode.XcodeProject
): xcode.XcodeProject {
  const bundleReactNative = getBundleReactNativePhase(project);
  const buildPhaseShellScriptPath = formatConfigurationScriptPath(projectRoot);

  if (!isShellScriptBuildPhaseConfigured(projectRoot, project)) {
    // check if there's already another path to create-manifest-ios.sh
    // this might be the case for monorepos
    if (bundleReactNative.shellScript.includes(CREATE_MANIFEST_IOS_PATH)) {
      bundleReactNative.shellScript = bundleReactNative.shellScript.replace(
        new RegExp(`(\\\\n)(\\.\\.)+/node_modules/${CREATE_MANIFEST_IOS_PATH}`),
        ''
      );
    }
    bundleReactNative.shellScript = `${bundleReactNative.shellScript.replace(
      /"$/,
      ''
    )}${buildPhaseShellScriptPath}\\n"`;
  }
  return project;
}

export function isShellScriptBuildPhaseConfigured(
  projectRoot: string,
  project: xcode.XcodeProject
): boolean {
  const bundleReactNative = getBundleReactNativePhase(project);
  const buildPhaseShellScriptPath = formatConfigurationScriptPath(projectRoot);
  return bundleReactNative.shellScript.includes(buildPhaseShellScriptPath);
}

export function isPlistConfigurationSet(expoPlist: ExpoPlist): boolean {
  return Boolean(
    expoPlist.EXUpdatesURL && (expoPlist.EXUpdatesSDKVersion || expoPlist.EXUpdatesRuntimeVersion)
  );
}

export function isPlistConfigurationSynced(
  config: ExpoConfigUpdates,
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
  config: Pick<ExpoConfigUpdates, 'sdkVersion' | 'runtimeVersion'>,
  expoPlist: ExpoPlist
): boolean {
  const expectedRuntimeVersion = getRuntimeVersionNullable(config, 'ios');
  const expectedSdkVersion = getSDKVersion(config);

  const currentRuntimeVersion = expoPlist.EXUpdatesRuntimeVersion ?? null;
  const currentSdkVersion = expoPlist.EXUpdatesSDKVersion ?? null;

  if (expectedRuntimeVersion !== null) {
    return currentRuntimeVersion === expectedRuntimeVersion && currentSdkVersion === null;
  } else if (expectedSdkVersion !== null) {
    return currentSdkVersion === expectedSdkVersion && currentRuntimeVersion === null;
  } else {
    return true;
  }
}
