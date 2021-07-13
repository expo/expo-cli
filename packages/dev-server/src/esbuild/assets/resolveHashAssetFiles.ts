import resolveFrom from 'resolve-from';

export function resolveHashAssetFiles(projectRoot: string) {
  try {
    return resolveFrom(projectRoot, 'expo-asset/tools/hashAssetFiles');
  } catch {
    throw new Error(
      'cannot resolve `expo-asset/tools/hashAssetFiles`, please install `expo-asset` and try again.'
    );
  }
}
