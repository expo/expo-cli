import type { ExpoConfig } from '@expo/config-types';

import type { ConfigPlugin } from '../Plugin.types';
import { withPodfileProperties } from '../plugins/ios-plugins';
import { BuildPropertiesConfig, ConfigToPropertyRuleType } from '../utils/BuildProperties.types';

/**
 * Creates a `withPodfileProperties` config-plugin based on given config to property mapping rules.
 *
 * @param configToPropertyRules config to property mapping rules
 * @param options
 *   - `sourceConfig` custom source config, or use the expo config if unspecified.
 *   - `name` config plugin name
 */
export function createBuildPodfilePropsConfigPlugin<SourceConfigType extends BuildPropertiesConfig>(
  configToPropertyRules: ConfigToPropertyRuleType<SourceConfigType>[],
  options?: {
    sourceConfig?: SourceConfigType;
    name?: string;
  }
): ConfigPlugin {
  const withUnknown: ConfigPlugin = config =>
    withPodfileProperties(config, config => {
      config.modResults = updateIosBuildPropertiesFromConfig(
        (options?.sourceConfig ?? config) as SourceConfigType,
        config.modResults,
        configToPropertyRules
      );
      return config;
    });
  if (options?.name) {
    Object.defineProperty(withUnknown, 'name', {
      value: options.name,
    });
  }
  return withUnknown;
}

/**
 * A config-plugin to update `ios/Podfile.properties.json` from the `jsEngine` in expo config
 */
export const withJsEnginePodfileProps = createBuildPodfilePropsConfigPlugin<ExpoConfig>(
  [
    {
      propName: 'expo.jsEngine',
      propValueGetter: config => config.ios?.jsEngine ?? config.jsEngine ?? 'jsc',
    },
  ],
  {
    name: 'withJsEnginePodfileProps',
  }
);

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
