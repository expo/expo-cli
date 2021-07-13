import resolveFrom from 'resolve-from';

export function isDevMenuInstalled(projectRoot: string): boolean {
  // TODO: Maybe this should look for expo-dev-launcher as well
  return !!resolveFrom.silent(projectRoot, 'expo-dev-menu');
}
