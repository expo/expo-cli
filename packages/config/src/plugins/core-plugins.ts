import {
  ConfigPlugin,
  ExportedConfig,
  PluginConfig,
  PluginModifier,
  ProjectFileSystem,
} from '../Config.types';

function ensureArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

export function withPlugins(config: ExportedConfig, plugins: ConfigPlugin[]): ExportedConfig {
  const out = plugins.reduce((prev, curr) => {
    const [plugins, args] = ensureArray(curr);
    return plugins(prev, args);
  }, config);
  return out;
}

export function withFile<T extends ProjectFileSystem = ProjectFileSystem>(
  config: ExportedConfig,
  platform: keyof PluginConfig,
  action: PluginModifier<T>
): ExportedConfig {
  return withModifier<T>(config, platform, 'file', action);
}

export function withModifier<T extends ProjectFileSystem>(
  { expo, plugins }: ExportedConfig,
  platform: keyof PluginConfig,
  modifier: string,
  action: PluginModifier<T>
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
