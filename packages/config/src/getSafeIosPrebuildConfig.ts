import { BaseMods, ModPlatform } from '@expo/config-plugins';
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
export function getSafeIosPrebuildConfig(
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
  // Apply the custom base mods last
  config.exp = withSafeIosPrebuildBaseMods(config.exp);

  return config;
}

/**
 * Apply all base mods that have a `noPersist` option, delete all other mods.
 */
function withSafeIosPrebuildBaseMods(config: ExpoConfig): ExpoConfig {
  const providers = BaseMods.getIosModFileProviders();
  config = BaseMods.withIosBaseMods(config, {
    enabled: {
      infoPlist: {
        getFilePathAsync(...props) {
          try {
            return providers.infoPlist.getFilePathAsync(...props);
          } catch {
            return '';
          }
        },

        async readAsync(...props) {
          try {
            return providers.infoPlist.readAsync(...props);
          } catch {
            return {
              // TODO: Maybe use template statics somehow?
            };
          }
        },

        async writeAsync() {},
      },

      entitlements: {
        getFilePathAsync(...props) {
          try {
            return providers.entitlements.getFilePathAsync(...props);
          } catch {
            return '';
          }
        },

        async readAsync(...props) {
          try {
            return providers.entitlements.readAsync(...props);
          } catch {
            return {
              // TODO: Remove this from the template
              'aps-environment': 'development',
            };
          }
        },

        async writeAsync() {},
      },
    },
  });

  // Delete all mods that don't have noPersist options.
  BaseMods.clearMods(config, 'ios', ['infoPlist', 'entitlements']);

  return config;
}
