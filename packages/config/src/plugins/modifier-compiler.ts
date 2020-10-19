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
  return await evalModifiersAsync(config, { projectRoot });
}

/**
 * A generic plugin compiler.
 *
 * @param config
 */
export async function evalModifiersAsync(
  config: ExportedConfig,
  props: { projectRoot: string }
): Promise<ExportedConfig> {
  for (const [platformName, platform] of Object.entries(
    config.modifiers ?? ({} as ModifierConfig)
  )) {
    const entries = Object.entries(platform);
    if (entries.length) {
      const platformProjectRoot = path.join(props.projectRoot, platformName);
      const projectName = platformName === 'ios' ? getProjectName(props.projectRoot) : undefined;

      for (const [modifierName, modifier] of entries) {
        const modInfo = {
          ...props,
          projectName,
          platformProjectRoot,
          platform: platformName as ModifierPlatform,
          modifierName,
        };
        const results = await (modifier as Modifier)({
          ...config,
          modResults: null,
          modInfo,
        });

        // Sanity check to help locate non compliant modifiers.
        config = resolveModifierResults(results, platformName, modifierName);
        // @ts-ignore: data is added for modifications
        delete config.modResults;
        // @ts-ignore: info is added for modifications
        delete config.modInfo;
      }
    }
  }
  // // Delete modifiers after they've been compiled.
  // delete config.modifiers;

  return config;
}
