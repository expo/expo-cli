import { ExpoConfig, getConfig } from '@expo/config';
import { UserManager } from '@expo/xdl';

export default async function getConfigurationOptionsAsync(
  projectDir: string
): Promise<{ exp: ExpoConfig; username: string | null }> {
  const username = await UserManager.getCurrentUsernameAsync();

  const { exp } = getConfig(projectDir, { skipSDKVersionRequirement: true });

  if (!exp.runtimeVersion && !exp.sdkVersion) {
    throw new Error(
      "Couldn't find either 'runtimeVersion' or 'sdkVersion' to configure 'expo-updates'. Please specify at least one of these properties under the 'expo' key in 'app.json'"
    );
  }

  return { exp, username };
}
