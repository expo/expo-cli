import { getConfigWithModifiers } from '@expo/config';
import { ExportedConfig } from '@expo/config/build/Plugin.types';
import { withExpoIOSPlugins } from '@expo/config/build/plugins/expo-plugins';
import { compileModifiersAsync } from '@expo/config/build/plugins/modifier-compiler';
import { UserManager } from '@expo/xdl';

import { getOrPromptForBundleIdentifier } from '../eject/ConfigValidation';

export default async function configureIOSProjectAsync(projectRoot: string) {
  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  const expoUsername = await UserManager.getCurrentUsernameAsync();

  let { exp: config } = getConfigWithModifiers(projectRoot, { skipSDKVersionRequirement: true });

  // Add all built-in plugins
  config = withExpoIOSPlugins(config, {
    bundleIdentifier,
    expoUsername,
  });

  // compile all plugins and modifiers
  await compileModifiersAsync(config, projectRoot);
}
