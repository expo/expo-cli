import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAppBuildGradle } from '../plugins/android-plugins';
import * as WarningAggregator from '../utils/warnings';

export const withVersion: ConfigPlugin = config => {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = setVersionCode(config, config.modResults.contents);
      config.modResults.contents = setVersionName(config, config.modResults.contents);
    } else {
      WarningAggregator.addWarningAndroid(
        'android-version',
        `Cannot automatically configure app build.gradle if it's not groovy`
      );
    }
    return config;
  });
};

export function getVersionName(config: Pick<ExpoConfig, 'version'>) {
  return config.version ?? null;
}

export function setVersionName(config: Pick<ExpoConfig, 'version'>, buildGradle: string) {
  const versionName = getVersionName(config);
  if (versionName === null) {
    return buildGradle;
  }

  const pattern = new RegExp(`versionName ".*"`);
  return buildGradle.replace(pattern, `versionName "${versionName}"`);
}

export function getVersionCode(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.versionCode ?? null;
}

export function setVersionCode(config: Pick<ExpoConfig, 'android'>, buildGradle: string) {
  const versionCode = getVersionCode(config);
  if (versionCode === null) {
    return buildGradle;
  }

  const pattern = new RegExp(`versionCode.*`);
  return buildGradle.replace(pattern, `versionCode ${versionCode}`);
}
