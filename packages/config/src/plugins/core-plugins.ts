import {
  ConfigModifierPlugin,
  ConfigPlugin,
  ExportedConfig,
  PluginModifierProps,
  PluginPlatform,
} from '../Config.types';

export function ensureArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

type AppliedConfigPlugin<T = any> = ConfigPlugin<T> | [ConfigPlugin<T>, T];

/**
 * Plugin to chain a list of plugins together.
 *
 * @param config exported config
 * @param plugins list of config config plugins to apply to the exported config
 */
export const withPlugins: ConfigPlugin<AppliedConfigPlugin[]> = (
  config,
  plugins
): ExportedConfig => {
  return plugins.reduce((prev, curr) => {
    const [plugins, args] = ensureArray(curr);
    return plugins(prev, args);
  }, config);
};

/**
 * Plugin to extend a modifier function in the plugins config.
 *
 * @param config exported config
 * @param platform platform to target (ios or android)
 * @param modifier name of the platform function to extend
 * @param action method to run on the modifier when the config is compiled
 */
export function withExtendedModifier<T extends PluginModifierProps>(
  config: ExportedConfig,
  {
    platform,
    modifier,
    action,
  }: {
    platform: PluginPlatform;
    modifier: string;
    action: ConfigModifierPlugin<T>;
  }
): ExportedConfig {
  return withInterceptedModifier(config, {
    platform,
    modifier,
    async action(config, { nextModifier, ...props }) {
      const results = await action(config, props as T);
      return nextModifier(...results);
    },
  });
}

export function withInterceptedModifier<T extends PluginModifierProps>(
  config: ExportedConfig,
  {
    platform,
    modifier,
    action,
  }: {
    platform: PluginPlatform;
    modifier: string;
    action: ConfigModifierPlugin<T & { nextModifier: ConfigModifierPlugin<T> }, T>;
  }
): ExportedConfig {
  if (!config.plugins) {
    config.plugins = {};
  }
  if (!config.plugins[platform]) {
    config.plugins[platform] = {};
  }

  const modifierPlugin: ConfigModifierPlugin<T> =
    (config.plugins[platform] as Record<string, any>)[modifier] ??
    ((config, props) => [config, props]);

  const extendedModifier: ConfigModifierPlugin<T> = async (config, props) => {
    return action(config, { ...props, nextModifier: modifierPlugin });
  };

  (config.plugins[platform] as any)[modifier] = extendedModifier;

  return config;
}
