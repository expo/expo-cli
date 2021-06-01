import type { ExpoConfig } from '@expo/config-types';

import type { ConfigPlugin } from '../Plugin.types';
import { withGradleProperties } from '../plugins/android-plugins';
import type { PropertiesItem } from './Properties';

export const GRADLE_PROP_KEY = 'expo.jsEngine';
export const DEFAULT_ENGINE = 'jsc';

export const withEngine: ConfigPlugin = config => {
  return withGradleProperties(config, config => {
    config.modResults = setEngine(config, config.modResults);
    return config;
  });
};

export function getEngine(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.engine ?? DEFAULT_ENGINE;
}

export function setEngine(
  config: Pick<ExpoConfig, 'android'>,
  gradleProperties: PropertiesItem[]
): PropertiesItem[] {
  const oldPropIndex = gradleProperties.findIndex(
    prop => prop.type === 'property' && prop.key === GRADLE_PROP_KEY
  );
  const newProp: PropertiesItem = {
    type: 'property',
    key: GRADLE_PROP_KEY,
    value: config.android?.engine ?? DEFAULT_ENGINE,
  };

  if (oldPropIndex >= 0) {
    gradleProperties[oldPropIndex] = newProp;
  } else {
    gradleProperties.push(newProp);
  }

  return gradleProperties;
}
