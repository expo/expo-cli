import { getConfig } from '@expo/config';
import { withExpoAndroidPlugins } from '@expo/config/build/plugins/expo-plugins';
import { compileModsAsync } from '@expo/config/build/plugins/mod-compiler';
import { UserManager } from '@expo/xdl';
import { boolish } from 'getenv';

import log from '../../log';
import { getOrPromptForPackage } from '../eject/ConfigValidation';

const isDebug = boolish('EXPO_DEBUG', false);

export default async function configureAndroidProjectAsync(projectRoot: string) {
  // Check package before reading the config because it may mutate the config if the user is prompted to define it.
  const packageName = await getOrPromptForPackage(projectRoot);
  const expoUsername =
    process.env.EAS_BUILD_USERNAME || (await UserManager.getCurrentUsernameAsync());

  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  // Add all built-in plugins
  config = withExpoAndroidPlugins(config, {
    projectRoot,
    package: packageName,
    expoUsername,
  });

  // compile all plugins and mods
  config = await compileModsAsync(config, projectRoot);
  if (isDebug) {
    log('Fully evaluated config:\n');
    log(config);
  }
}
