import { getConfig } from '@expo/config';
import { compileModsAsync, ModPlatform, withExpoAndroidPlugins } from '@expo/config-plugins';
import { UserManager } from '@expo/xdl';

import log from '../../log';
import { getOrPromptForAndroidApplicationIdAndPackageName } from '../eject/ConfigValidation';

export default async function configureAndroidProjectAsync({
  projectRoot,
  platforms,
}: {
  projectRoot: string;
  platforms: ModPlatform[];
}) {
  // Check package/applicationId before reading the config because it may mutate the config if the user is prompted to define them.
  const { applicationId, packageName } = await getOrPromptForAndroidApplicationIdAndPackageName(
    projectRoot
  );
  const expoUsername =
    process.env.EAS_BUILD_USERNAME || (await UserManager.getCurrentUsernameAsync());

  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  // Add all built-in plugins
  config = withExpoAndroidPlugins(config, {
    applicationId,
    package: packageName,
    expoUsername,
  });

  // compile all plugins and mods
  config = await compileModsAsync(config, { projectRoot, platforms });

  if (log.isDebug) {
    log.debug();
    log.debug('Evaluated Android config:');
    // @ts-ignore: mods not on config type
    const { mods, ...rest } = config;
    log.info(JSON.stringify(rest, null, 2));
    log.info(mods);
    log.debug();
  }
}
