import path from 'path';

import { ExportedConfig, Mod, ModConfig, ModPlatform } from '../Plugin.types';
import { getHackyProjectName } from '../ios/utils/Xcodeproj';
import { assertModResults, ForwardedBaseModOptions } from './createBaseMod';
import { getAndroidIntrospectModFileProviders, withAndroidBaseMods } from './withAndroidBaseMods';
import { getIosIntrospectModFileProviders, withIosBaseMods } from './withIosBaseMods';

export function withDefaultBaseMods(
  config: ExportedConfig,
  props: ForwardedBaseModOptions = {}
): ExportedConfig {
  config = withIosBaseMods(config, props);
  config = withAndroidBaseMods(config, props);
  return config;
}

/**
 * Get a prebuild config that safely evaluates mods without persisting any changes to the file system.
 * Currently this only supports infoPlist, entitlements, androidManifest, strings, gradleProperties, and expoPlist mods.
 * This plugin should be evaluated directly:
 */
export function withIntrospectionBaseMods(
  config: ExportedConfig,
  props: ForwardedBaseModOptions = {}
): ExportedConfig {
  const iosProviders = getIosIntrospectModFileProviders();
  const androidProviders = getAndroidIntrospectModFileProviders();
  config = withIosBaseMods(config, {
    providers: iosProviders,
    saveToInternal: true,
    // This writing optimization can be skipped since we never write in introspection mode.
    // Including empty mods will ensure that all mods get introspected.
    skipEmptyMod: false,
    ...props,
  });
  config = withAndroidBaseMods(config, {
    providers: androidProviders,
    saveToInternal: true,
    skipEmptyMod: false,
    ...props,
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

/**
 *
 * @param projectRoot
 * @param config
 */
export async function compileModsAsync(
  config: ExportedConfig,
  { introspect, ...props }: { projectRoot: string; platforms?: ModPlatform[]; introspect?: boolean }
): Promise<ExportedConfig> {
  if (introspect === true) {
    config = withIntrospectionBaseMods(config);
  } else {
    config = withDefaultBaseMods(config);
  }
  return await evalModsAsync(config, props);
}

function sortMods(commands: [string, any][], order: string[]): [string, any][] {
  const allKeys = commands.map(([key]) => key);
  const completeOrder = [...new Set([...order, ...allKeys])];
  const sorted: [string, any][] = [];
  while (completeOrder.length) {
    const group = completeOrder.shift()!;
    const commandSet = commands.find(([key]) => key === group);
    if (commandSet) {
      sorted.push(commandSet);
    }
  }
  return sorted;
}

const orders: Record<string, string[]> = {
  ios: [
    // dangerous runs first
    'dangerous',
    // run the XcodeProject mod second because many plugins attempt to read from it.
    'xcodeproj',
  ],
  android: ['dangerous'],
};
/**
 * A generic plugin compiler.
 *
 * @param config
 */
export async function evalModsAsync(
  config: ExportedConfig,
  { projectRoot, platforms }: { projectRoot: string; platforms?: ModPlatform[] }
): Promise<ExportedConfig> {
  for (const [platformName, platform] of Object.entries(config.mods ?? ({} as ModConfig))) {
    if (platforms && !platforms.includes(platformName as any)) {
      continue;
    }

    let entries = Object.entries(platform);
    if (entries.length) {
      // Move dangerous item to the first position if it exists, this ensures that all dangerous code runs first.
      entries = sortMods(entries, orders[platformName]!);

      const platformProjectRoot = path.join(projectRoot, platformName);
      const projectName =
        platformName === 'ios' ? getHackyProjectName(projectRoot, config) : undefined;

      for (const [modName, mod] of entries) {
        const modRequest = {
          projectRoot,
          projectName,
          platformProjectRoot,
          platform: platformName as ModPlatform,
          modName,
        };

        const results = await (mod as Mod)({
          ...config,
          modResults: null,
          modRequest,
        });

        // Sanity check to help locate non compliant mods.
        config = assertModResults(results, platformName, modName);
        // @ts-ignore: data is added for modifications
        delete config.modResults;
        // @ts-ignore: info is added for modifications
        delete config.modRequest;
      }
    }
  }

  return config;
}
