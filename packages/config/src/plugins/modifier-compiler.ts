import path from 'path';

import { ExportedConfig, Modifier, ModifierConfig, ModifierPlatform } from '../Plugin.types';
import { getProjectName } from '../ios/utils/Xcodeproj';
import { resolveModifierResults, withCoreModifiers } from './compiler-plugins';

/**
 *
 * @param projectRoot
 * @param config
 */
export async function compileModifiersAsync(
  config: ExportedConfig,
  projectRoot: string
): Promise<ExportedConfig> {
  config = withCoreModifiers(config, projectRoot);
  return await evalModifiersAsync(config, projectRoot);
}

/**
 * A generic plugin compiler.
 *
 * @param config
 */
export async function evalModifiersAsync(
  config: ExportedConfig,
  projectRoot: string
): Promise<ExportedConfig> {
  for (const [platformName, platform] of Object.entries(
    config.modifiers ?? ({} as ModifierConfig)
  )) {
    const entries = Object.entries(platform);
    if (entries.length) {
      const platformProjectRoot = path.join(projectRoot, platformName);
      const projectName = platformName === 'ios' ? getProjectName(projectRoot) : undefined;

      for (const [modifierName, modifier] of entries) {
        const modRequest = {
          projectRoot,
          projectName,
          platformProjectRoot,
          platform: platformName as ModifierPlatform,
          modifierName,
        };
        const results = await (modifier as Modifier)({
          ...config,
          modResults: null,
          modRequest,
        });

        // Sanity check to help locate non compliant modifiers.
        config = resolveModifierResults(results, platformName, modifierName);
        // @ts-ignore: data is added for modifications
        delete config.modResults;
        // @ts-ignore: info is added for modifications
        delete config.modRequest;
      }
    }
  }

  return config;
}
