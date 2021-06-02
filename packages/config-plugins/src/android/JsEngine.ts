import type { ExpoConfig } from '@expo/config-types';

import type { ConfigPlugin } from '../Plugin.types';
import { withGradleProperties } from '../plugins/android-plugins';
import type { PropertiesItem } from './Properties';

export const JS_ENGINE_PROP_KEY = 'expo.jsEngine';
export const DEFAULT_JS_ENGINE = 'jsc';

export const withJsEngineGradleProps: ConfigPlugin = config => {
  return withGradleProperties(config, config => {
    config.modResults = setJsEngine(config, config.modResults);
    return config;
  });
};

export function getJsEngine(config: Pick<ExpoConfig, 'android'>) {
  return config.android?.jsEngine ?? DEFAULT_JS_ENGINE;
}

export function setJsEngine(
  config: Pick<ExpoConfig, 'android'>,
  gradleProperties: PropertiesItem[]
): PropertiesItem[] {
  const oldPropIndex = gradleProperties.findIndex(
    prop => prop.type === 'property' && prop.key === JS_ENGINE_PROP_KEY
  );
  const newProp: PropertiesItem = {
    type: 'property',
    key: JS_ENGINE_PROP_KEY,
    value: config.android?.jsEngine ?? DEFAULT_JS_ENGINE,
  };

  if (oldPropIndex >= 0) {
    gradleProperties[oldPropIndex] = newProp;
  } else {
    gradleProperties.push(newProp);
  }

  return gradleProperties;
}
