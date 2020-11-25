import path from 'path';

import { ExportedConfig, Mod, ModConfig, ModPlatform } from '../Plugin.types';
import { getHackyProjectName } from '../ios/utils/Xcodeproj';
import { resolveModResults, withBaseMods } from './compiler-plugins';

/**
 *
 * @param projectRoot
 * @param config
 */
export async function compileModsAsync(
  config: ExportedConfig,
  projectRoot: string
): Promise<ExportedConfig> {
  config = withBaseMods(config);
  return await evalModsAsync(config, projectRoot);
}

/**
 * A generic plugin compiler.
 *
 * @param config
 */
export async function evalModsAsync(
  config: ExportedConfig,
  projectRoot: string
): Promise<ExportedConfig> {
  for (const [platformName, platform] of Object.entries(config.mods ?? ({} as ModConfig))) {
    const entries = Object.entries(platform);
    if (entries.length) {
      const dangerousIndex = entries.findIndex(([modName]) => modName === 'dangerous');
      if (dangerousIndex > -1) {
        // Move dangerous item to the first position if it exists, this ensures that all dangerous code runs first.
        entries.splice(0, 0, entries.splice(dangerousIndex, 1)[0]);
      }

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
        config = resolveModResults(results, platformName, modName);
        // @ts-ignore: data is added for modifications
        delete config.modResults;
        // @ts-ignore: info is added for modifications
        delete config.modRequest;
      }
    }
  }

  return config;
}
