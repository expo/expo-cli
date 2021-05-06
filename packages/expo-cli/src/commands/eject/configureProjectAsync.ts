import { ExpoConfig, getConfig, ProjectConfig } from '@expo/config';
import {
  compileModsAsync,
  ModPlatform,
  withExpoAndroidPlugins,
  withExpoIOSPlugins,
  withExpoLegacyPlugins,
  withExpoVersionedSDKPlugins,
} from '@expo/config-plugins';
import util from 'util';
import { UserManager } from 'xdl';

import Log from '../../log';
import {
  getOrPromptForBundleIdentifier,
  getOrPromptForPackage,
} from '../utils/getOrPromptApplicationId';

export async function getModdedConfigAsync({
  projectRoot,
  platforms,
  bundleIdentifier,
  packageName,
}: {
  projectRoot: string;
  bundleIdentifier?: string;
  packageName?: string;
  platforms: ModPlatform[];
}) {
  // let config: ExpoConfig;
  let { exp: config, ...rest } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  const expoUsername =
    config.owner ||
    process.env.EXPO_CLI_USERNAME ||
    process.env.EAS_BUILD_USERNAME ||
    (await UserManager.getCurrentUsernameAsync());

  // Add all built-in plugins first because they should take
  // priority over the unversioned plugins.
  config = withExpoVersionedSDKPlugins(config, { expoUsername });
  config = withExpoLegacyPlugins(config);

  if (platforms.includes('ios')) {
    if (!config.ios) config.ios = {};
    config.ios.bundleIdentifier =
      bundleIdentifier ?? config.ios.bundleIdentifier ?? 'UNDEFINED (invalid)';

    // Add all built-in plugins
    config = withExpoIOSPlugins(config, {
      bundleIdentifier: config.ios.bundleIdentifier,
    });
  }

  if (platforms.includes('android')) {
    if (!config.android) config.android = {};
    config.android.package = packageName ?? config.android.package ?? 'UNDEFINED (invalid)';

    // Add all built-in plugins
    config = withExpoAndroidPlugins(config, {
      package: config.android.package,
    });
  }

  return { exp: config, ...rest };
}

export function logConfig(config: ExpoConfig | ProjectConfig) {
  const isObjStr = (str: string): boolean => /^\w+: {/g.test(str);
  Log.log(
    util.inspect(config, {
      colors: true,
      compact: false,
      // Sort objects to the end so that smaller values aren't hidden between large objects.
      sorted(a: string, b: string) {
        if (isObjStr(a)) return 1;
        if (isObjStr(b)) return -1;
        return 0;
      },
      showHidden: false,
      depth: null,
    })
  );
}

export default async function configureManagedProjectAsync({
  projectRoot,
  platforms,
}: {
  projectRoot: string;
  platforms: ModPlatform[];
}) {
  let bundleIdentifier: string | undefined;
  if (platforms.includes('ios')) {
    // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
    bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  }
  let packageName: string | undefined;
  if (platforms.includes('android')) {
    // Check package before reading the config because it may mutate the config if the user is prompted to define it.
    packageName = await getOrPromptForPackage(projectRoot);
  }

  let { exp: config } = await getModdedConfigAsync({
    projectRoot,
    platforms,
    packageName,
    bundleIdentifier,
  });

  // compile all plugins and mods
  config = await compileModsAsync(config, { projectRoot, platforms });

  if (Log.isDebug) {
    Log.debug();
    Log.debug('Evaluated config:');
    logConfig(config);
    Log.debug();
  }

  return config;
}
