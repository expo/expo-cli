import type { ConfigPlugin } from '../Plugin.types';
import { withPodfileProperties } from '../plugins/ios-plugins';
import { BuildPropertiesConfig, ConfigToPropertyRuleType } from '../utils/BuildProperties.types';

/**
 * A config-plugin to update `ios/Podfile.properties.json` based on config.
 *
 * @param config expo config
 * @param props parameters as following:
 *   - `configToPropertyRules`: rules to transform from source config to Podfile.properties.json
 *   - `sourceConfig`: [OPTIONAL] transform source config. when this parameter is null, the source config will be the expo config.
 */
export const withBuildPodfileProps: ConfigPlugin<{
  configToPropertyRules: ConfigToPropertyRuleType[];
  sourceConfig?: BuildPropertiesConfig;
}> = (config, props) => {
  return withPodfileProperties(config, config => {
    config.modResults = updateIosBuildPropertiesFromConfig(
      props.sourceConfig ?? config,
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
  const configToPropertyRules: ConfigToPropertyRuleType[] = [
    {
      propName: 'expo.jsEngine',
      propValueGetter: config => config.ios?.jsEngine ?? config.jsEngine ?? 'jsc',
    },
  ];
  return withBuildPodfileProps(config, {
    configToPropertyRules,
  });
};

export function updateIosBuildPropertiesFromConfig(
  config: BuildPropertiesConfig,
  podfileProperties: Record<string, string>,
  configToPropertyRules: ConfigToPropertyRuleType[]
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
