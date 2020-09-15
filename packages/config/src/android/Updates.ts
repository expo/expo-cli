import { ExpoConfig } from '../Config.types';
import { MetaDataItem } from './Manifest';
import { addOrRemoveMetaDataItemInArray } from './MetaData';

export function getUpdateUrl(config: ExpoConfig, username: string | null) {
  const user = typeof config.owner === 'string' ? config.owner : username;
  if (!user) {
    return null;
  }
  return `https://exp.host/@${user}/${config.slug}`;
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

export function syncUpdatesConfigMetaData(
  config: ExpoConfig,
  username: string | null
): MetaDataItem[] {
  let metadata = config.android?.metadata ?? [];
  metadata = metadata as MetaDataItem[];

  const enabled = getUpdatesEnabled(config);
  const checkAutomatically = getUpdatesCheckOnLaunch(config);
  const fallbackToCacheTimeout = getUpdatesTimeout(config);
  const updateUrl = getUpdateUrl(config, username);
  const sdkVersion = getSDKVersion(config);

  metadata = addOrRemoveMetaDataItemInArray(metadata, {
    name: 'expo.modules.updates.EXPO_UPDATE_URL',
    value: updateUrl,
  });
  metadata = addOrRemoveMetaDataItemInArray(metadata, {
    name: 'expo.modules.updates.EXPO_SDK_VERSION',
    value: sdkVersion,
  });
  metadata = addOrRemoveMetaDataItemInArray(metadata, {
    name: 'expo.modules.updates.ENABLED',
    value: enabled,
  });
  metadata = addOrRemoveMetaDataItemInArray(metadata, {
    name: 'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH',
    value: checkAutomatically,
  });
  metadata = addOrRemoveMetaDataItemInArray(metadata, {
    name: 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS',
    value: fallbackToCacheTimeout,
  });

  return metadata;
}
