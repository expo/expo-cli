import { getPackageJson } from '@expo/config';

export default function isExpoUpdatesInstalled(projectDir: string) {
  const packageJson = getPackageJson(projectDir);

  return packageJson.dependencies && 'expo-updates' in packageJson.dependencies;
}
