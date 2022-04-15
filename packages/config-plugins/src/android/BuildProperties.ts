import type { ExpoConfig } from '@expo/config-types';

import type { ConfigPlugin } from '../Plugin.types';
import { withGradleProperties } from '../plugins/android-plugins';
import {
  BuildPropertiesConfig,
  BuildPropertiesConfigPlugin,
  ConfigToPropertyRuleType,
} from '../utils/BuildProperties.types';
import type { PropertiesItem } from './Properties';

/**
 * A config-plugin to update `android/gradle.properties` based on config.
 *
 * @param config expo config
 * @param props parameters as following:
 *   - `configToPropertyRules`: rules to transform from source config to gradle properties.
 *   - `sourceConfig`: [OPTIONAL] transform source config. when this parameter is null, the source config will be the expo config.
 */
export const withBuildGradleProps: BuildPropertiesConfigPlugin = (config, props) => {
  const _config = (props.sourceConfig ?? config) as NonNullable<typeof props.sourceConfig>;
  return withGradleProperties(config, config => {
    config.modResults = updateAndroidBuildPropertiesFromConfig(
      _config,
      config.modResults,
      props.configToPropertyRules
    );
    return config;
  });
};

/**
 * A config-plugin to update `android/gradle.properties` from the `jsEngine` in expo config
 */
export const withJsEngineGradleProps: ConfigPlugin = config => {
  return withBuildGradleProps<ExpoConfig>(config, {
    configToPropertyRules: [
      {
        propName: 'expo.jsEngine',
        propValueGetter: config => config.android?.jsEngine ?? config.jsEngine ?? 'jsc',
      },
    ],
  });
};

export function updateAndroidBuildPropertiesFromConfig<
  SourceConfigType extends BuildPropertiesConfig
>(
  config: SourceConfigType,
  gradleProperties: PropertiesItem[],
  configToPropertyRules: ConfigToPropertyRuleType<SourceConfigType>[]
) {
  for (const configToProperty of configToPropertyRules) {
    const value = configToProperty.propValueGetter(config);
    updateAndroidBuildProperty(gradleProperties, configToProperty.propName, value);
  }

  return gradleProperties;
}

export function updateAndroidBuildProperty(
  gradleProperties: PropertiesItem[],
  name: string,
  value: string | null | undefined,
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
