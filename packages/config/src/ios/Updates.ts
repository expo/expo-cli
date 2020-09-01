import { ExpoConfig } from '../Config.types';
import { ExpoPlist } from './IosConfig.types';

export enum Config {
  ENABLED = 'EXUpdatesEnabled',
  CHECK_ON_LAUNCH = 'EXUpdatesCheckOnLaunch',
  LAUNCH_WAIT_MS = 'EXUpdatesLaunchWaitMs',
  RUNTIME_VERSION = 'EXUpdatesRuntimeVersion',
  SDK_VERSION = 'EXUpdatesSDKVersion',
  UPDATE_URL = 'EXUpdatesURL',
}

export function getUpdateUrl(config: ExpoConfig, username: string | null) {
  const user = typeof config.owner === 'string' ? config.owner : username;
  if (!user) {
    return undefined;
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

export function setVersionsConfig(config: ExpoConfig, expoPlist: ExpoPlist) {
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
