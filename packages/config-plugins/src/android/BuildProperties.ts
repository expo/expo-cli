import type { ExpoConfig } from '@expo/config-types';

import type { ConfigPlugin } from '../Plugin.types';
import { withGradleProperties } from '../plugins/android-plugins';
import { ConfigToPropertyRuleType, findFirstMatchedField } from '../utils/BuildPropertiesCommon';
import type { PropertiesItem } from './Properties';

/**
 * A config-plugin to update `android/gradle.properties` based on expo config.
 *
 * @param config expo config
 * @param ConfigToPropertyRules rules to transform from expo config to gradle properties
 */
export const withBuildGradleProps: ConfigPlugin<ConfigToPropertyRuleType[]> = (
  config,
  ConfigToPropertyRules
) => {
  return withGradleProperties(config, config => {
    config.modResults = updateAndroidBuildPropertiesFromConfig(
      config,
      config.modResults,
      ConfigToPropertyRules
    );
    return config;
  });
};

/**
 * A config-plugin to update `android/gradle.properties` from the `jsEngine` in expo config
 */
export const withJsEngineGradleProps: ConfigPlugin = config => {
  return withBuildGradleProps(config, [
    {
      propName: 'expo.jsEngine',
      configFields: ['android.jsEngine', 'jsEngine'],
      defaultValue: 'jsc',
    },
  ]);
};

export function updateAndroidBuildPropertiesFromConfig(
  config: Partial<ExpoConfig>,
  gradleProperties: PropertiesItem[],
  ConfigToPropertyRules: ConfigToPropertyRuleType[]
) {
  for (const configToProperty of ConfigToPropertyRules) {
    const value =
      findFirstMatchedField(config, configToProperty.configFields) ??
      configToProperty.defaultValue ??
      null;

    updateAndroidBuildProperty(gradleProperties, configToProperty.propName, value);
  }

  return gradleProperties;
}

export function updateAndroidBuildProperty(
  gradleProperties: PropertiesItem[],
  name: string,
  value: string | null,
  options?: { removePropWhenValueIsNull?: boolean }
) {
  const oldPropIndex = gradleProperties.findIndex(
    prop => prop.type === 'property' && prop.key === name
  );

  if (value) {
    // found the matched value, add or merge new property
    const newProp: PropertiesItem = {
      type: 'property',
      key: name,
      value,
    };

    if (oldPropIndex >= 0) {
      gradleProperties[oldPropIndex] = newProp;
    } else {
      gradleProperties.push(newProp);
    }
  } else if (options?.removePropWhenValueIsNull && oldPropIndex >= 0) {
    gradleProperties.splice(oldPropIndex, 1);
  }

  return gradleProperties;
}
