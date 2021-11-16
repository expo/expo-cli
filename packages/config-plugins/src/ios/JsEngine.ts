import type { ExpoConfig } from '@expo/config-types';

import type { ConfigPlugin } from '../Plugin.types';
import { withPodfileProperties } from '../plugins/ios-plugins';

export const JS_ENGINE_PROP_KEY = 'expo.jsEngine';
export const DEFAULT_JS_ENGINE = 'jsc';

export const withJsEnginePodfileProps: ConfigPlugin = config => {
  return withPodfileProperties(config, config => {
    config.modResults = setJsEngine(config, config.modResults);
    return config;
  });
};

export function getJsEngine(config: Pick<ExpoConfig, 'ios' | 'jsEngine'>) {
  return config.ios?.jsEngine ?? config.jsEngine ?? DEFAULT_JS_ENGINE;
}

export function setJsEngine(
  config: Pick<ExpoConfig, 'ios' | 'jsEngine'>,
  podfileProperties: Record<string, string>
): Record<string, string> {
  podfileProperties[JS_ENGINE_PROP_KEY] =
    config.ios?.jsEngine ?? config.jsEngine ?? DEFAULT_JS_ENGINE;
  return podfileProperties;
}
