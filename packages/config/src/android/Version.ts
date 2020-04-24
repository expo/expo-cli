import { ExpoConfig } from '../Config.types';

const DEFAULT_VERSION_NAME = '1.0';
const DEFAULT_VERSION_CODE = '1';

export function getVersionName(config: ExpoConfig) {
  return config.version ? config.version : null;
}

export function setVersionName(
  config: ExpoConfig,
  buildGradle: string,
  versionToReplace = DEFAULT_VERSION_NAME
) {
  let versionName = getVersionName(config);
  if (versionName === null) {
    return buildGradle;
  }

  let pattern = new RegExp(`versionName "${versionToReplace}"`);
  return buildGradle.replace(pattern, `versionName "${versionName}"`);
}

export function getVersionCode(config: ExpoConfig) {
  return config.android && config.android.versionCode ? config.android.versionCode : null;
}

export function setVersionCode(
  config: ExpoConfig,
  buildGradle: string,
  versionCodeToReplace = DEFAULT_VERSION_CODE
) {
  let versionCode = getVersionCode(config);
  if (versionCode === null) {
    return buildGradle;
  }

  let pattern = new RegExp(`versionCode ${versionCodeToReplace}`);
  return buildGradle.replace(pattern, `versionCode ${versionCode}`);
}
