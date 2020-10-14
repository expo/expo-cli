import {
  ConfigPlugin,
  ExportedConfig,
  PluginModifier,
  PluginPlatform,
  ProjectFileSystem,
} from '../Config.types';

function ensureArray<T>(input: T | T[]): T[] {
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
  { expo, plugins }: ExportedConfig,
  {
    platform,
    modifier,
    action,
  }: {
    platform: PluginPlatform;
    modifier: string;
    action: PluginModifier<T>;
  }
): ExportedConfig {
  if (!plugins) {
    plugins = {};
  }
  if (!plugins[platform]) {
    plugins[platform] = {};
  }

  const modifierPlugin = (plugins[platform] as Record<string, any>)[modifier];

  (plugins[platform] as Record<string, any>)[modifier] = async (props: T) => {
    const results = await action(props);
    return modifierPlugin ? modifierPlugin(results) : results;
  };

  return { expo, plugins };
}
