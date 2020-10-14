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

export const withPlugins: ConfigPlugin<(ConfigPlugin | AppliedConfigPlugin)[]> = (
  config,
  plugins
): ExportedConfig => {
  return plugins.reduce((prev, curr) => {
    const [plugins, args] = ensureArray(curr);
    return plugins(prev, args);
  }, config);
};

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
