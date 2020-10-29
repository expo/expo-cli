import { ExpoConfig, getPackageJson } from '@expo/config';

export function isExpoUpdatesInstalled(projectDir: string) {
  const packageJson = getPackageJson(projectDir);
  return packageJson.dependencies && 'expo-updates' in packageJson.dependencies;
}

export function ensureValidVersions(exp: ExpoConfig): void {
  if (!exp.runtimeVersion && !exp.sdkVersion) {
    throw new Error(
      "Couldn't find either 'runtimeVersion' or 'sdkVersion' to configure 'expo-updates'. Please specify at least one of these properties under the 'expo' key in 'app.json'"
    );
  }
}
