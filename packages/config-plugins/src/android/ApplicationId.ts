import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAppBuildGradle } from '../plugins/android-plugins';
import * as WarningAggregator from '../utils/warnings';

export const withApplicationIdGradle: ConfigPlugin = config => {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = setApplicationIdInBuildGradle(
        config,
        config.modResults.contents
      );
    } else {
      WarningAggregator.addWarningAndroid(
        'android-application-id',
        `Cannot automatically configure app build.gradle if it's not groovy`
      );
    }
    return config;
  });
};

/**
 * Get `applicationId` from the android's configuration.
 * If there's no `applicationId` it fallbacks and tries with `android.package`.
 */
export function getApplicationId(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.applicationId ?? config.android?.package ?? null;
}

export function setApplicationIdInBuildGradle(
  config: Pick<ExpoConfig, 'android'>,
  buildGradle: string
) {
  const applicationId = getApplicationId(config);
  if (applicationId === null) {
    return buildGradle;
  }

  const pattern = new RegExp(`applicationId ['"].*['"]`);
  return buildGradle.replace(pattern, `applicationId '${applicationId}'`);
}
