import path from 'path';

import {
  ExportedConfig,
  Modifier,
  ModifierConfig,
  ModifierPlatform,
  ModifierProps,
} from '../Plugin.types';
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
    const platformProjectRoot = path.join(props.projectRoot, platformName);
    const projectName = platformName === 'ios' ? getProjectName(props.projectRoot) : undefined;

    for (const [modifierName, modifier] of Object.entries(platform)) {
      const results = await (modifier as Modifier<ModifierProps>)({
        ...config,
        props: {
          ...props,
          projectName,
          platformProjectRoot,
          platform: platformName as ModifierPlatform,
          modifierName,
          data: null,
        },
      });

      // Sanity check to help locate non compliant modifiers.
      config = resolveModifierResults(results, platformName, modifierName);
    }
  }
  return config;
}
