import { getConfigWithMods } from '@expo/config';
import { withExpoIOSPlugins } from '@expo/config/build/plugins/expo-plugins';
import { compileModsAsync } from '@expo/config/build/plugins/mod-compiler';
import { UserManager } from '@expo/xdl';

import { getOrPromptForBundleIdentifier } from '../eject/ConfigValidation';

export default async function configureIOSProjectAsync(projectRoot: string) {
  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  const expoUsername =
    process.env.EAS_BUILD_USERNAME || (await UserManager.getCurrentUsernameAsync());

  let { exp: config } = getConfigWithMods(projectRoot, { skipSDKVersionRequirement: true });

  // Add all built-in plugins
  config = withExpoIOSPlugins(config, {
    bundleIdentifier,
    expoUsername,
  });

  // compile all plugins and mods
  await compileModsAsync(config, projectRoot);
}
