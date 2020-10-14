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

type AppliedConfigPlugin<T = any> = [ConfigPlugin<T>, T];

/**
 * Plugin to chain a list of plugins together.
 *
 * @param config exported config
 * @param plugins list of config config plugins to apply to the exported config
 */
export const withPlugins: ConfigPlugin<(ConfigPlugin | AppliedConfigPlugin)[]> = (
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
  { plugins, ...config }: ExportedConfig,
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
  if (!plugins) {
    plugins = {};
  }
  if (!plugins[platform]) {
    plugins[platform] = {};
  }

  const modifierPlugin = (plugins[platform] as Record<string, any>)[modifier];

  const extendedPlugin: ConfigModifierPlugin<T> = async (config, props) => {
    const results = await action(config, { ...props, modifyAsync: modifierPlugin });
    return modifierPlugin ? modifierPlugin(...results) : results;
  };

  (plugins[platform] as any)[modifier] = extendedPlugin;

  return { plugins, ...config };
}

export type AsyncDataProviderModifier<T extends PluginModifierProps> = PluginModifierProps & {
  modifyAsync: ConfigModifierPlugin<T>;
};

export function withDataProvider<T extends PluginModifierProps>(
  { plugins, ...config }: ExportedConfig,
  {
    platform,
    modifier,
    action,
  }: {
    platform: PluginPlatform;
    modifier: string;
    action: ConfigModifierPlugin<T & { modifyAsync: ConfigModifierPlugin<T> }, T>;
  }
): ExportedConfig {
  if (!plugins) {
    plugins = {};
  }
  if (!plugins[platform]) {
    plugins[platform] = {};
  }

  const modifierPlugin: ConfigModifierPlugin<T> =
    (plugins[platform] as Record<string, any>)[modifier] ?? ((config, props) => [config, props]);

  const extendedModifier: ConfigModifierPlugin<T> = async (config, props) => {
    return action(config, { ...props, modifyAsync: modifierPlugin });
  };

  // @ts-ignore: used for asserting when a modifier isn't a data provider in the compiler.
  extendedModifier.isDataProvider = true;

  (plugins[platform] as any)[modifier] = extendedModifier;

  return { plugins, ...config };
}
