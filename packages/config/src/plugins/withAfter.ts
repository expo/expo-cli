import { ExpoConfig, PackConfig, PackModifier, ProjectConfig } from '../Config.types';

export function withAfter<T>(
  { exp, pack }: Pick<ProjectConfig, 'exp' | 'pack'>,
  platform: 'ios' | 'android',
  action: PackModifier<T>
): { exp: ExpoConfig; pack: PackConfig } {
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

  return { exp, pack };
}
