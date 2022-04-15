import type { ExpoConfig } from '@expo/config-types';

import type { ConfigPlugin } from '../Plugin.types';
import { withPodfileProperties } from '../plugins/ios-plugins';
import {
  BuildPropertiesConfig,
  BuildPropertiesConfigPlugin,
  ConfigToPropertyRuleType,
} from '../utils/BuildProperties.types';

/**
 * A config-plugin to update `ios/Podfile.properties.json` based on config.
 *
 * @param config expo config
 * @param props parameters as following:
 *   - `configToPropertyRules`: rules to transform from source config to Podfile.properties.json
 *   - `sourceConfig`: [OPTIONAL] transform source config. when this parameter is null, the source config will be the expo config.
 */
export const withBuildPodfileProps: BuildPropertiesConfigPlugin = (config, props) => {
  return withPodfileProperties(config, config => {
    const _config = (props.sourceConfig ?? config) as NonNullable<typeof props.sourceConfig>;
    config.modResults = updateIosBuildPropertiesFromConfig(
      _config,
      config.modResults,
      props.configToPropertyRules
    );
    return config;
  });
};

/**
 * A config-plugin to update `ios/Podfile.properties.json` from the `jsEngine` in expo config
 */
export const withJsEnginePodfileProps: ConfigPlugin = config => {
  return withBuildPodfileProps<ExpoConfig>(config, {
    configToPropertyRules: [
      {
        propName: 'expo.jsEngine',
        propValueGetter: config => config.ios?.jsEngine ?? config.jsEngine ?? 'jsc',
      },
    ],
  });
};

export function updateIosBuildPropertiesFromConfig<SourceConfigType extends BuildPropertiesConfig>(
  config: SourceConfigType,
  podfileProperties: Record<string, string>,
  configToPropertyRules: ConfigToPropertyRuleType<SourceConfigType>[]
) {
  for (const configToProperty of configToPropertyRules) {
    const value = configToProperty.propValueGetter(config);
    updateIosBuildProperty(podfileProperties, configToProperty.propName, value);
  }
  return podfileProperties;
}

export function updateIosBuildProperty(
  podfileProperties: Record<string, string>,
  name: string,
  value: string | null | undefined,
  options?: { removePropWhenValueIsNull?: boolean }
) {
  if (value) {
    podfileProperties[name] = value;
  } else if (options?.removePropWhenValueIsNull) {
    delete podfileProperties[name];
  }
  return podfileProperties;
}
