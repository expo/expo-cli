import { ExportedConfig, getConfig, IOSConfig } from '@expo/config/build';
import { withExpoIOSPlugins } from '@expo/config/build/plugins/expo-plugins';
import { compilePluginsAsync } from '@expo/config/build/plugins/plugin-compiler';
import { UserManager } from '@expo/xdl';

import { getOrPromptForBundleIdentifier } from '../eject/ConfigValidation';

export default async function configureIOSProjectAsync(projectRoot: string) {
  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectRoot, bundleIdentifier);
  const expoUsername = await UserManager.getCurrentUsernameAsync();

  //// New System
  let config = getExportedConfig(projectRoot);

  // Add all built-in plugins
  config = withExpoIOSPlugins(config, {
    bundleIdentifier,
    expoUsername,
  });

  // compile all plugins and modifiers
  await compilePluginsAsync(projectRoot, config);
}

function getExportedConfig(projectRoot: string): ExportedConfig {
  const originalConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return { expo: originalConfig.exp, plugins: originalConfig.plugins };
}
