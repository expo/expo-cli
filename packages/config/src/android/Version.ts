import { ExpoConfig } from '../Config.types';

const DEFAULT_VERSION_NAME = '1.0';
const DEFAULT_VERSION_CODE = '1';

export function getVersionName(config: Pick<ExpoConfig, 'version'>) {
  return config.version ?? null;
}

export function setVersionName(
  config: Pick<ExpoConfig, 'version'>,
  buildGradle: string,
  versionToReplace = DEFAULT_VERSION_NAME
) {
  const versionName = getVersionName(config);
  if (versionName === null) {
    return buildGradle;
  }

  const pattern = new RegExp(`versionName "${versionToReplace}"`);
  return buildGradle.replace(pattern, `versionName "${versionName}"`);
}

export function getVersionCode(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.versionCode ?? null;
}

export function setVersionCode(
  config: Pick<ExpoConfig, 'android'>,
  buildGradle: string,
  versionCodeToReplace = DEFAULT_VERSION_CODE
) {
  const versionCode = getVersionCode(config);
  if (versionCode === null) {
    return buildGradle;
  }

  const pattern = new RegExp(`versionCode ${versionCodeToReplace}`);
  return buildGradle.replace(pattern, `versionCode ${versionCode}`);
}
