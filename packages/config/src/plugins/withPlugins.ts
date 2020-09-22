import { ConfigPlugin, ProjectConfig } from '../Config.types';

function ensureArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

type ExportedConfig = Pick<ProjectConfig, 'pack'> & { expo: ProjectConfig['exp'] };

export function withPlugins(config: ExportedConfig, plugins: ConfigPlugin[]): ExportedConfig {
  const out = plugins.reduce((prev, curr) => {
    const [plugin, args] = ensureArray(curr);
    return plugin(prev, args);
  }, config);
  return out;
}
