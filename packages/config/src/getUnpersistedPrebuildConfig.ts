import { BaseModPlugins, ModConfig, ModPlatform } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';

import { getPrebuildConfig } from './getPrebuildConfig';

/**
 * Get a prebuild config that safely evaluates mods without persisting any changes to the file system.
 * Currently this only supports Info.plist and entitlements files.
 * This plugin should be evaluated directly:
 *
 * ```ts
 * await evalModsAsync(config.exp, {
 *   projectRoot,
 *   platforms: ['ios'],
 * });
 * ```
 */
export function getUnpersistedPrebuildConfig(
  projectRoot: string,
  {
    platforms = ['ios'],
    bundleIdentifier,
    packageName,
    expoUsername,
  }: {
    bundleIdentifier?: string;
    packageName?: string;
    platforms?: ModPlatform[];
    expoUsername?: string | ((config: ExpoConfig) => string | null);
  } = {}
) {
  // Get the prebuild config with mods, auto plugins, and built-in plugins.
  const config = getPrebuildConfig(projectRoot, {
    platforms,
    bundleIdentifier,
    packageName,
    expoUsername,
  });
  // Apply the unpersisted base mods last
  config.exp = withUnpersistedBaseMods(config.exp);

  return config;
}

/**
 * Apply all base mods that have a `skipPersistence` option, delete all other mods.
 */
function withUnpersistedBaseMods(config: ExpoConfig): ExpoConfig {
  config = BaseModPlugins.withIOSEntitlementsPlistBaseMod(config, {
    skipPersistence: true,
  });
  config = BaseModPlugins.withIOSInfoPlistBaseMod(config, { skipPersistence: true });

  // Delete all mods that don't have skipPersistence options.

  const mods = (config as any).mods as ModConfig;
  mods.android = {};

  if (mods.ios) {
    for (const key of Object.keys(mods.ios)) {
      if (!['entitlements', 'infoPlist'].includes(key)) {
        // @ts-ignore
        delete mods.ios[key];
      }
    }
  }

  return config;
}
