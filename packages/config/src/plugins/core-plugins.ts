import {
  ConfigModifierPlugin,
  ConfigPlugin,
  ExportedConfig,
  IOSPlistModifier,
  PluginModifier,
  PluginPlatform,
  ProjectFileSystem,
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
export function withModifier<T extends ProjectFileSystem>(
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
    const results = await action(config, { ...props, nextAction: modifierPlugin });
    return modifierPlugin ? modifierPlugin(...results) : results;
  };

  (plugins[platform] as any)[modifier] = extendedPlugin;

  return { plugins, ...config };
}

export type AsyncDataProviderModifier<T extends ProjectFileSystem> = ProjectFileSystem & {
  nextAction: ConfigModifierPlugin<T>;
};

export function withAsyncDataProvider<T extends ProjectFileSystem>(
  { plugins, ...config }: ExportedConfig,
  {
    platform,
    modifier,
    action,
  }: {
    platform: PluginPlatform;
    modifier: string;
    action: ConfigModifierPlugin<T & { nextAction: ConfigModifierPlugin<T> }, T>;
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

  const extendedPlugin: ConfigModifierPlugin<T> = async (config, props) => {
    return action(config, { ...props, nextAction: modifierPlugin });
  };

  (plugins[platform] as any)[modifier] = extendedPlugin;

  return { plugins, ...config };
}
