import path from 'path';
import resolveFrom from 'resolve-from';
import semver from 'semver';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidManifest } from '../plugins/android-plugins';
import {
  ExpoConfigUpdates,
  getExpoUpdatesPackageVersion,
  getRuntimeVersionNullable,
  getUpdateUrl,
} from '../utils/Updates';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  findMetaDataItem,
  getMainApplicationMetaDataValue,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

const CREATE_MANIFEST_ANDROID_PATH = 'expo-updates/scripts/create-manifest-android.gradle';

export enum Config {
  ENABLED = 'expo.modules.updates.ENABLED',
  CHECK_ON_LAUNCH = 'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH',
  LAUNCH_WAIT_MS = 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS',
  SDK_VERSION = 'expo.modules.updates.EXPO_SDK_VERSION',
  RUNTIME_VERSION = 'expo.modules.updates.EXPO_RUNTIME_VERSION',
  UPDATE_URL = 'expo.modules.updates.EXPO_UPDATE_URL',
  RELEASE_CHANNEL = 'expo.modules.updates.EXPO_RELEASE_CHANNEL',
  UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY = 'expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY',
}

export const withUpdates: ConfigPlugin<{ expoUsername: string | null }> = (
  config,
  { expoUsername }
) => {
  return withAndroidManifest(config, config => {
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

export function getSDKVersion(config: Pick<ExpoConfigUpdates, 'sdkVersion'>): string | null {
  return typeof config.sdkVersion === 'string' ? config.sdkVersion : null;
}

export function getUpdatesEnabled(config: Pick<ExpoConfigUpdates, 'updates'>): boolean {
  return config.updates?.enabled !== false;
}

export function getUpdatesTimeout(config: Pick<ExpoConfigUpdates, 'updates'>): number {
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

export function setUpdatesConfig(
  config: ExpoConfigUpdates,
  androidManifest: AndroidManifest,
  username: string | null,
  expoUpdatesPackageVersion?: string | null
): AndroidManifest {
  const mainApplication = getMainApplicationOrThrow(androidManifest);

  addMetaDataItemToMainApplication(
    mainApplication,
    Config.ENABLED,
    String(getUpdatesEnabled(config))
  );
  addMetaDataItemToMainApplication(
    mainApplication,
    Config.CHECK_ON_LAUNCH,
    getUpdatesCheckOnLaunch(config, expoUpdatesPackageVersion)
  );
  addMetaDataItemToMainApplication(
    mainApplication,
    Config.LAUNCH_WAIT_MS,
    String(getUpdatesTimeout(config))
  );

  const updateUrl = getUpdateUrl(config, username);
  if (updateUrl) {
    addMetaDataItemToMainApplication(mainApplication, Config.UPDATE_URL, updateUrl);
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, Config.UPDATE_URL);
  }

  return setVersionsConfig(config, androidManifest);
}

export function setVersionsConfig(
  config: Pick<ExpoConfigUpdates, 'sdkVersion' | 'runtimeVersion'>,
  androidManifest: AndroidManifest
): AndroidManifest {
  const mainApplication = getMainApplicationOrThrow(androidManifest);

  const runtimeVersion = getRuntimeVersionNullable(config, 'android');
  if (!runtimeVersion && findMetaDataItem(mainApplication, Config.RUNTIME_VERSION) > -1) {
    throw new Error(
      'A runtime version is set in your AndroidManifest.xml, but is missing from your app.json/app.config.js. Please either set runtimeVersion in your app.json/app.config.js or remove expo.modules.updates.EXPO_RUNTIME_VERSION from your AndroidManifest.xml.'
    );
  }
  const sdkVersion = getSDKVersion(config);
  if (runtimeVersion) {
    removeMetaDataItemFromMainApplication(mainApplication, Config.SDK_VERSION);
    addMetaDataItemToMainApplication(mainApplication, Config.RUNTIME_VERSION, runtimeVersion);
  } else if (sdkVersion) {
    /**
     * runtime version maybe null in projects using classic updates. In that
     * case we use SDK version
     */
    removeMetaDataItemFromMainApplication(mainApplication, Config.RUNTIME_VERSION);
    addMetaDataItemToMainApplication(mainApplication, Config.SDK_VERSION, sdkVersion);
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, Config.RUNTIME_VERSION);
    removeMetaDataItemFromMainApplication(mainApplication, Config.SDK_VERSION);
  }

  return androidManifest;
}
export function ensureBuildGradleContainsConfigurationScript(
  projectRoot: string,
  buildGradleContents: string
): string {
  if (!isBuildGradleConfigured(projectRoot, buildGradleContents)) {
    let cleanedUpBuildGradleContents;

    const isBuildGradleMisconfigured = buildGradleContents
      .split('\n')
      .some(line => line.includes(CREATE_MANIFEST_ANDROID_PATH));
    if (isBuildGradleMisconfigured) {
      cleanedUpBuildGradleContents = buildGradleContents.replace(
        new RegExp(`(\n// Integration with Expo updates)?\n.*${CREATE_MANIFEST_ANDROID_PATH}.*\n`),
        ''
      );
    } else {
      cleanedUpBuildGradleContents = buildGradleContents;
    }

    const gradleScriptApply = formatApplyLineForBuildGradle(projectRoot);
    return `${cleanedUpBuildGradleContents}\n// Integration with Expo updates\n${gradleScriptApply}\n`;
  } else {
    return buildGradleContents;
  }
}

export function formatApplyLineForBuildGradle(projectRoot: string): string {
  const updatesGradleScriptPath = resolveFrom.silent(projectRoot, CREATE_MANIFEST_ANDROID_PATH);

  if (!updatesGradleScriptPath) {
    throw new Error(
      "Could not find the build script for Android. This could happen in case of outdated 'node_modules'. Run 'npm install' to make sure that it's up-to-date."
    );
  }

  const relativePath = path.relative(
    path.join(projectRoot, 'android', 'app'),
    updatesGradleScriptPath
  );
  const posixPath = process.platform === 'win32' ? relativePath.replace(/\\/g, '/') : relativePath;

  return `apply from: "${posixPath}"`;
}

export function isBuildGradleConfigured(projectRoot: string, buildGradleContents: string): boolean {
  const androidBuildScript = formatApplyLineForBuildGradle(projectRoot);

  return (
    buildGradleContents
      .replace(/\r\n/g, '\n')
      .split('\n')
      // Check for both single and double quotes
      .some(line => line === androidBuildScript || line === androidBuildScript.replace(/"/g, "'"))
  );
}

export function isMainApplicationMetaDataSet(androidManifest: AndroidManifest): boolean {
  const updateUrl = getMainApplicationMetaDataValue(androidManifest, Config.UPDATE_URL);
  const runtimeVersion = getMainApplicationMetaDataValue(androidManifest, Config.RUNTIME_VERSION);
  const sdkVersion = getMainApplicationMetaDataValue(androidManifest, Config.SDK_VERSION);

  return Boolean(updateUrl && (sdkVersion || runtimeVersion));
}

export function isMainApplicationMetaDataSynced(
  config: ExpoConfigUpdates,
  androidManifest: AndroidManifest,
  username: string | null
): boolean {
  return (
    getUpdateUrl(config, username) ===
      getMainApplicationMetaDataValue(androidManifest, Config.UPDATE_URL) &&
    String(getUpdatesEnabled(config)) ===
      getMainApplicationMetaDataValue(androidManifest, Config.ENABLED) &&
    String(getUpdatesTimeout(config)) ===
      getMainApplicationMetaDataValue(androidManifest, Config.LAUNCH_WAIT_MS) &&
    getUpdatesCheckOnLaunch(config) ===
      getMainApplicationMetaDataValue(androidManifest, Config.CHECK_ON_LAUNCH) &&
    areVersionsSynced(config, androidManifest)
  );
}

export function areVersionsSynced(
  config: Pick<ExpoConfigUpdates, 'runtimeVersion' | 'sdkVersion'>,
  androidManifest: AndroidManifest
): boolean {
  const expectedRuntimeVersion = getRuntimeVersionNullable(config, 'android');
  const expectedSdkVersion = getSDKVersion(config);

  const currentRuntimeVersion = getMainApplicationMetaDataValue(
    androidManifest,
    Config.RUNTIME_VERSION
  );
  const currentSdkVersion = getMainApplicationMetaDataValue(androidManifest, Config.SDK_VERSION);

  if (expectedRuntimeVersion !== null) {
    return currentRuntimeVersion === expectedRuntimeVersion && currentSdkVersion === null;
  } else if (expectedSdkVersion !== null) {
    return currentSdkVersion === expectedSdkVersion && currentRuntimeVersion === null;
  } else {
    return true;
  }
}
