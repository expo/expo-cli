import { ExpoConfig, getPackageJson } from '@expo/config';
import { UserManager } from '@expo/xdl';

import { getProjectOwner } from '../../../../projects';

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

export async function getAccountName(exp: ExpoConfig): Promise<string | null> {
  const user = await UserManager.getCurrentUserAsync();
  return user ? getProjectOwner(user, exp) : null;
}
