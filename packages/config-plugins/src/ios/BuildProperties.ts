import type { ExpoConfig } from '@expo/config-types';

import type { ConfigPlugin } from '../Plugin.types';
import { withPodfileProperties } from '../plugins/ios-plugins';
import { ConfigToPropertyRuleType, findFirstMatchedField } from '../utils/BuildPropertiesCommon';

/**
 * A config-plugin to update `ios/Podfile.properties.json` based on expo config.
 *
 * @param config expo config
 * @param ConfigToPropertyRules rules to transform from expo config to Podfile.properties.json
 */
export const withBuildPodfileProps: ConfigPlugin<ConfigToPropertyRuleType[]> = (
  config,
  ConfigToPropertyRules
) => {
  return withPodfileProperties(config, config => {
    config.modResults = updateIosBuildPropertiesFromConfig(
      config,
      config.modResults,
      ConfigToPropertyRules
    );
    return config;
  });
};

/**
 * A config-plugin to update `ios/Podfile.properties.json` from the `jsEngine` in expo config
 */
export const withJsEnginePodfileProps: ConfigPlugin = config => {
  return withBuildPodfileProps(config, [
    {
      propName: 'expo.jsEngine',
      configFields: ['ios.jsEngine', 'jsEngine'],
      defaultValue: 'jsc',
    },
  ]);
};

export function updateIosBuildPropertiesFromConfig(
  config: Partial<ExpoConfig>,
  podfileProperties: Record<string, string>,
  ConfigToPropertyRules: ConfigToPropertyRuleType[]
) {
  for (const configToProperty of ConfigToPropertyRules) {
    const value =
      findFirstMatchedField(config, configToProperty.configFields) ??
      configToProperty.defaultValue ??
      null;
    updateIosBuildProperty(podfileProperties, configToProperty.propName, value);
  }
  return podfileProperties;
}

export function updateIosBuildProperty(
  podfileProperties: Record<string, string>,
  name: string,
  value: string | null,
  options?: { removePropWhenValueIsNull?: boolean }
) {
  if (value) {
    podfileProperties[name] = value;
  } else if (options?.removePropWhenValueIsNull) {
    delete podfileProperties[name];
  }
  return podfileProperties;
}
