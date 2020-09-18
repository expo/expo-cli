import { ProjectConfig } from '../Config.types';

function ensureArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

type ExportedConfig = Pick<ProjectConfig, 'pack'> & { expo: ProjectConfig['exp'] };
type PluginAction = (config: ExportedConfig) => ExportedConfig;
// Action or action with arguments
type Plugin = PluginAction | [PluginAction, any];

export function withPlugins(plugins: Plugin[], config: ExportedConfig): ExportedConfig {
  const out = plugins.reduce((prev, curr) => {
    const [plugin, args] = ensureArray(curr);
    return plugin(prev, args);
  }, config);
  return out;
}
