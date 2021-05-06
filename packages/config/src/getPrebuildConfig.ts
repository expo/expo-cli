import {
  ModPlatform,
  withExpoAndroidPlugins,
  withExpoIOSPlugins,
  withExpoLegacyPlugins,
  withExpoVersionedSDKPlugins,
} from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';

import { getConfig } from './Config';
import { getAccountUsername } from './getCurrentFullName';

export async function getPrebuildConfig({
  projectRoot,
  platforms,
  bundleIdentifier,
  packageName,
  expoUsername,
}: {
  projectRoot: string;
  bundleIdentifier?: string;
  packageName?: string;
  platforms: ModPlatform[];
  expoUsername?: string | ((config: ExpoConfig) => Promise<string | null>);
}) {
  // let config: ExpoConfig;
  let { exp: config, ...rest } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  const resolvedExpoUsername =
    typeof expoUsername === 'function'
      ? await expoUsername(config)
      : // If the user didn't pass a username then fallback on the static cached username.
        expoUsername ?? getAccountUsername(config);

  // Add all built-in plugins first because they should take
  // priority over the unversioned plugins.
  config = withExpoVersionedSDKPlugins(config, {
    expoUsername: resolvedExpoUsername,
  });
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
