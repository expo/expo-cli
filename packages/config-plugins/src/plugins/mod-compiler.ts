import path from 'path';

import { ExportedConfig, Mod, ModConfig, ModPlatform } from '../Plugin.types';
import { getHackyProjectName } from '../ios/utils/Xcodeproj';
import { assertModResults, ForwardedBaseModOptions } from './createBaseMod';
import { withAndroidBaseMods } from './withAndroidBaseMods';
import { withIosBaseMods } from './withIosBaseMods';

export function withDefaultBaseMods(
  config: ExportedConfig,
  props: ForwardedBaseModOptions = {}
): ExportedConfig {
  config = withIosBaseMods(config, props);
  config = withAndroidBaseMods(config, props);
  return config;
}

/**
 *
 * @param projectRoot
 * @param config
 */
export async function compileModsAsync(
  config: ExportedConfig,
  props: { projectRoot: string; platforms?: ModPlatform[] }
): Promise<ExportedConfig> {
  config = withDefaultBaseMods(config);
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
