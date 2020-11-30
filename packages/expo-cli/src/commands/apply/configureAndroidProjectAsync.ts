import { getConfig } from '@expo/config';
import {
  compileModsAsync,
  withExpoAndroidPlugins,
  withExpoIOSPlugins,
  withThirdPartyPlugins,
} from '@expo/config-plugins';
import { UserManager } from '@expo/xdl';

import log from '../../log';
import { getOrPromptForBundleIdentifier, getOrPromptForPackage } from '../eject/ConfigValidation';

export default async function configureAndroidProjectAsync(projectRoot: string) {
  // Check package before reading the config because it may mutate the config if the user is prompted to define it.
  const packageName = await getOrPromptForPackage(projectRoot);
  const expoUsername =
    process.env.EAS_BUILD_USERNAME || (await UserManager.getCurrentUsernameAsync());

  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);

  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  // Add all built-in plugins
  config = withExpoAndroidPlugins(config, {
    package: packageName,
    expoUsername,
  });

  // Skip ejecting for iOS on Windows
  if (process.platform !== 'win32') {
    config = withExpoIOSPlugins(config, {
      bundleIdentifier,
      expoUsername,
    });
  }

  // Add all legacy plugins
  config = withThirdPartyPlugins(config);

  // compile all plugins and mods
  config = await compileModsAsync(config, projectRoot);

  if (log.isDebug) {
    log.debug();
    log.debug('Evaluated config:');
    // @ts-ignore: mods not on config type
    const { mods, ...rest } = config;
    log.info(JSON.stringify(rest, null, 2));
    log.info(mods);
    log.debug();
  }
}
