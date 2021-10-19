import { ExpoConfig, ProjectConfig } from '@expo/config';
import { compileModsAsync, ModPlatform } from '@expo/config-plugins';
import { getPrebuildConfig, getPrebuildConfigAsync } from '@expo/prebuild-config';
import util from 'util';
import { UserManager } from 'xdl';

import Log from '../../log';
import {
  getOrPromptForBundleIdentifier,
  getOrPromptForPackage,
} from '../utils/getOrPromptApplicationId';

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

  const possibleUsername =
    process.env.EXPO_CLI_USERNAME ||
    process.env.EAS_BUILD_USERNAME ||
    (await UserManager.getCurrentUsernameAsync());

  let { exp: config } = await getPrebuildConfigAsync(projectRoot, {
    platforms,
    packageName,
    bundleIdentifier,
    expoUsername(config) {
      return config.owner || possibleUsername;
    },
  });

  // compile all plugins and mods
  config = await compileModsAsync(config, {
    projectRoot,
    platforms,
    assertMissingModProviders: false,
  });

  if (Log.isDebug) {
    Log.debug();
    Log.debug('Evaluated config:');
    logConfig(config);
    Log.debug();
  }

  return config;
}
