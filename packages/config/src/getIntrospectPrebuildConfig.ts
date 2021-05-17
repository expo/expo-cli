import { BaseMods, ExportedConfig, ModPlatform } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';

import { getPrebuildConfig } from './getPrebuildConfig';

/**
 * Get a prebuild config that safely evaluates mods without persisting any changes to the file system.
 * Currently this only supports infoPlist, entitlements, androidManifest, strings, and expoPlist mods.
 * This plugin should be evaluated directly:
 *
 * ```ts
 * await evalModsAsync(config.exp, {
 *   projectRoot,
 *   platforms: ['ios', 'android'],
 * });
 * ```
 */
export function getIntrospectPrebuildConfig(
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
  config.exp = withIntrospectPrebuildBaseMods(config.exp);

  return config;
}

/**
 * Apply all base mods that have a `noPersist` option, delete all other mods.
 */
function withIntrospectPrebuildBaseMods(config: ExportedConfig): ExpoConfig {
  const iosProviders = BaseMods.getIosIntrospectModFileProviders();
  const androidProviders = BaseMods.getAndroidIntrospectModFileProviders();
  config = BaseMods.withIosBaseMods(config, { providers: iosProviders, saveToInternal: true });
  config = BaseMods.withAndroidBaseMods(config, {
    providers: androidProviders,
    saveToInternal: true,
  });

  const preserve = {
    ios: Object.keys(iosProviders),
    android: Object.keys(androidProviders),
  };

  if (config.mods) {
    // Remove all mods that don't have an introspection base mod, for instance `dangerous` mods.
    for (const platform of Object.keys(config.mods) as ModPlatform[]) {
      if (!(platform in preserve)) {
        delete config.mods[platform];
      }
      const platformPreserve = preserve[platform];
      for (const key of Object.keys(config.mods[platform] || {})) {
        if (!platformPreserve?.includes(key)) {
          // @ts-ignore
          delete config.mods[platform][key];
        }
      }
    }
  }

  return config;
}
