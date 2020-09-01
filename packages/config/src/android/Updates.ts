import { ExpoConfig } from '../Config.types';
import {
  addMetaDataItemToMainApplication,
  Document,
  getMainApplication,
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

export function getUpdateUrl(config: ExpoConfig, username: string | null) {
  const user = typeof config.owner === 'string' ? config.owner : username;
  if (!user) {
    return null;
  }
  return `https://exp.host/@${user}/${config.slug}`;
}

export function getRuntimeVersion(config: ExpoConfig) {
  return typeof config.runtimeVersion === 'string' ? config.runtimeVersion : null;
}

export function getSDKVersion(config: ExpoConfig) {
  return typeof config.sdkVersion === 'string' ? config.sdkVersion : null;
}

export function getUpdatesEnabled(config: ExpoConfig) {
  return config.updates?.enabled !== false;
}

export function getUpdatesTimeout(config: ExpoConfig) {
  return config.updates?.fallbackToCacheTimeout ?? 0;
}

export function getUpdatesCheckOnLaunch(config: ExpoConfig) {
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
) {
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

export function setVersionsConfig(config: ExpoConfig, manifestDocument: Document) {
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
