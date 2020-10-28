import path from 'path';

import { ExpoConfig } from '../Config.types';
import { projectHasModule } from '../Modules';
import {
  addMetaDataItemToMainApplication,
  Document,
  getMainApplication,
  getMainApplicationMetaDataValue,
  removeMetaDataItemFromMainApplication,
} from './Manifest';

export enum Config {
  ENABLED = 'expo.modules.updates.ENABLED',
  CHECK_ON_LAUNCH = 'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH',
  LAUNCH_WAIT_MS = 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS',
  SDK_VERSION = 'expo.modules.updates.EXPO_SDK_VERSION',
  RUNTIME_VERSION = 'expo.modules.updates.EXPO_RUNTIME_VERSION',
  UPDATE_URL = 'expo.modules.updates.EXPO_UPDATE_URL',
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

export function getUpdatesTimeout(config: ExpoConfig): number {
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

export async function setUpdatesConfig(
  config: ExpoConfig,
  manifestDocument: Document,
  username: string | null
): Promise<Document> {
  const mainApplication = getMainApplication(manifestDocument);

  addMetaDataItemToMainApplication(
    mainApplication,
    Config.ENABLED,
    String(getUpdatesEnabled(config))
  );
  addMetaDataItemToMainApplication(
    mainApplication,
    Config.CHECK_ON_LAUNCH,
    getUpdatesCheckOnLaunch(config)
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

  return setVersionsConfig(config, manifestDocument);
}

export function setVersionsConfig(config: ExpoConfig, manifestDocument: Document): Document {
  const mainApplication = getMainApplication(manifestDocument);

  const runtimeVersion = getRuntimeVersion(config);
  const sdkVersion = getSDKVersion(config);
  if (runtimeVersion) {
    removeMetaDataItemFromMainApplication(mainApplication, Config.SDK_VERSION);
    addMetaDataItemToMainApplication(mainApplication, Config.RUNTIME_VERSION, runtimeVersion);
  } else if (sdkVersion) {
    removeMetaDataItemFromMainApplication(mainApplication, Config.RUNTIME_VERSION);
    addMetaDataItemToMainApplication(mainApplication, Config.SDK_VERSION, sdkVersion);
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, Config.RUNTIME_VERSION);
    removeMetaDataItemFromMainApplication(mainApplication, Config.SDK_VERSION);
  }

  return manifestDocument;
}

export function getGradleScriptApplyString(projectDir: string, config: ExpoConfig): string {
  const updatesGradleScriptPath = projectHasModule(
    'expo-updates/scripts/create-manifest-android.gradle',
    projectDir,
    config
  );

  if (!updatesGradleScriptPath) {
    throw new Error(
      "Could not find the build script for Android. This could happen in case of outdated 'node_modules'. Run 'npm install' to make sure that it's up-to-date."
    );
  }

  return `apply from: ${JSON.stringify(
    path.relative(path.join(projectDir, 'android', 'app'), updatesGradleScriptPath)
  )}`;
}

export function hasGradleScriptApply(
  buildGradleContent: string,
  projectDir: string,
  config: ExpoConfig
): boolean {
  const androidBuildScript = getGradleScriptApplyString(projectDir, config);

  return (
    buildGradleContent
      .split('\n')
      // Check for both single and double quotes
      .some(line => line === androidBuildScript || line === androidBuildScript.replace(/"/g, "'"))
  );
}

export function isMainApplicationMetaDataSet(manifest: Document): boolean {
  const updateUrl = getMainApplicationMetaDataValue(manifest, Config.UPDATE_URL);
  if (!updateUrl) {
    return false;
  }

  const runtimeVersion = getMainApplicationMetaDataValue(manifest, Config.RUNTIME_VERSION);
  const sdkVersion = getMainApplicationMetaDataValue(manifest, Config.SDK_VERSION);
  if (!sdkVersion && !runtimeVersion) {
    return false;
  }
  return true;
}

export function isMainApplicationMetaDataSynced(
  config: ExpoConfig,
  manifest: Document,
  username: string | null
): boolean {
  const metadata = [
    {
      expectedValue: getUpdateUrl(config, username),
      manifestMetadata: Config.UPDATE_URL,
    },
    {
      expectedValue: String(getUpdatesEnabled(config)),
      manifestMetadata: Config.ENABLED,
    },
    {
      expectedValue: String(getUpdatesTimeout(config)),
      manifestMetadata: Config.LAUNCH_WAIT_MS,
    },
    {
      expectedValue: getUpdatesCheckOnLaunch(config),
      manifestMetadata: Config.CHECK_ON_LAUNCH,
    },
  ];

  for (const { manifestMetadata, expectedValue } of metadata) {
    const currentValue = getMainApplicationMetaDataValue(manifest, manifestMetadata);
    if (currentValue !== expectedValue) {
      return false;
    }
  }

  if (!isVersionSynced(config, manifest)) {
    return false;
  }

  return true;
}

export function isVersionSynced(config: ExpoConfig, manifest: Document): boolean {
  const expectedRuntimeVersion = getRuntimeVersion(config);
  const expectedSdkVersion = getSDKVersion(config);
  const currentRuntimeVersion = getMainApplicationMetaDataValue(manifest, Config.RUNTIME_VERSION);
  const currentSdkVersion = getMainApplicationMetaDataValue(manifest, Config.SDK_VERSION);

  if (!currentSdkVersion && !currentRuntimeVersion) {
    return false;
  }

  if (
    currentSdkVersion !== expectedSdkVersion ||
    currentRuntimeVersion !== expectedRuntimeVersion
  ) {
    return false;
  }

  return true;
}
