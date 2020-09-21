import { ExpoConfig } from '../Config.types';
import { ExpoPlist } from './IosConfig.types';

export function getUpdateUrl(config: ExpoConfig, username: string | null) {
  const user = typeof config.owner === 'string' ? config.owner : username;
  if (!user) {
    return undefined;
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

export function setUpdatesConfig(
  config: ExpoConfig,
  expoPlist: ExpoPlist,
  username: string | null
): ExpoPlist {
  let newExpoPlist = {
    ...expoPlist,
    EXUpdatesEnabled: getUpdatesEnabled(config),
    EXUpdatesURL: getUpdateUrl(config, username),
    EXUpdatesCheckOnLaunch: getUpdatesCheckOnLaunch(config),
    EXUpdatesLaunchWaitMs: getUpdatesTimeout(config),
  };

  const updateUrl = getUpdateUrl(config, username);
  if (updateUrl) {
    newExpoPlist = {
      ...newExpoPlist,
      EXUpdatesURL: updateUrl,
    };
  }

  const sdkVersion = getSDKVersion(config);
  if (sdkVersion) {
    newExpoPlist = {
      ...newExpoPlist,
      EXUpdatesSDKVersion: sdkVersion,
    };
  }

  return newExpoPlist;
}
