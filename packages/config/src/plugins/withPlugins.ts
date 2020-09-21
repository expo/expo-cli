import { ProjectConfig } from '../Config.types';

function ensureArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

type ExportedConfig = Pick<ProjectConfig, 'pack'> & { expo: ProjectConfig['exp'] };
// Action or action with arguments
type Plugin =
  | ((config: ExportedConfig) => ExportedConfig)
  | [(config: ExportedConfig, args: any) => ExportedConfig, any];

export function withPlugins(plugins: Plugin[], config: ExportedConfig): ExportedConfig {
  const out = plugins.reduce((prev, curr) => {
    const [plugin, args] = ensureArray(curr);
    return plugin(prev, args);
  }, config);
  return out;
}
