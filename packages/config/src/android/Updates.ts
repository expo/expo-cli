import { ConfigPlugin, ExpoConfig, ExportedConfig } from '../Config.types';
import {
  addMetaDataItemToMainApplication,
  Document,
  getMainApplication,
  withManifest,
} from './Manifest';

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

export const withUpdates = (config: ExportedConfig, username: string) => {
  return withManifest(config, async props => ({
    ...props,
    data: await setUpdatesConfig(config.expo, props.data, username),
  }));
};

export async function setUpdatesConfig(
  config: ExpoConfig,
  manifestDocument: Document,
  username: string | null
) {
  const mainApplication = getMainApplication(manifestDocument);

  addMetaDataItemToMainApplication(
    mainApplication,
    'expo.modules.updates.ENABLED',
    `${getUpdatesEnabled(config)}`
  );
  addMetaDataItemToMainApplication(
    mainApplication,
    'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH',
    getUpdatesCheckOnLaunch(config)
  );
  addMetaDataItemToMainApplication(
    mainApplication,
    'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS',
    `${getUpdatesTimeout(config)}`
  );

  const updateUrl = getUpdateUrl(config, username);
  if (updateUrl) {
    addMetaDataItemToMainApplication(
      mainApplication,
      'expo.modules.updates.EXPO_UPDATE_URL',
      updateUrl
    );
  }
  const sdkVersion = getSDKVersion(config);
  if (sdkVersion) {
    addMetaDataItemToMainApplication(
      mainApplication,
      'expo.modules.updates.EXPO_SDK_VERSION',
      sdkVersion
    );
  }

  return manifestDocument;
}
