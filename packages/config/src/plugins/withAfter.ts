import { ExportedConfig, PackConfig, PackModifier, ProjectFileSystem } from '../Config.types';

export function withAfter<T extends ProjectFileSystem = ProjectFileSystem>(
  config: ExportedConfig,
  platform: keyof PackConfig,
  action: PackModifier<T>
): ExportedConfig {
  return withModifier<T>(config, platform, 'after', action);
}

export function withModifier<T extends ProjectFileSystem>(
  { expo, pack }: ExportedConfig,
  platform: keyof PackConfig,
  modifier: string,
  action: PackModifier<T>
): ExportedConfig {
  if (!pack) {
    pack = {};
  }
  if (!pack[platform]) {
    pack[platform] = {};
  }

  // @ts-ignore
  const mod = pack[platform]![modifier];
  // @ts-ignore
  pack[platform]![modifier] = async (props: T) => {
    const results = await action(props);
    if (!results.files) {
      throw new Error('Invalid modifier: ' + action);
    }
    // @ts-ignore
    return mod ? mod(results) : results;
  };

  return { expo, pack };
}
