import { ExportedConfig, PackModifier } from '../Config.types';

export function withAfter<T>(
  { expo, pack }: ExportedConfig,
  platform: 'ios' | 'android',
  action: PackModifier<T>
): ExportedConfig {
  if (!pack) {
    pack = {};
  }
  if (!pack[platform]) {
    pack[platform] = {};
  }

  const { after } = pack[platform]!;
  // @ts-ignore
  pack[platform]!.after = async (props: T) => {
    const results = await action(props);
    // @ts-ignore
    return after ? after(results) : results;
  };

  return { expo, pack };
}

export function withModifier<T>(
  { expo, pack }: ExportedConfig,
  platform: 'ios' | 'android',
  modifier: string,
  action: PackModifier<T>
): ExportedConfig {
  if (!pack) {
    pack = {};
  }
  if (!pack[platform]) {
    pack[platform] = {};
  }

  const mod = pack[platform][modifier]!;
  // @ts-ignore
  pack[platform]![modifier] = async (props: T) => {
    const results = await action(props);
    // @ts-ignore
    return mod ? mod(results) : results;
  };

  return { expo, pack };
}
