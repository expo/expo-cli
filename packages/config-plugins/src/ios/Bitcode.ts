import { ExpoConfig } from '@expo/config-types';
import { XcodeProject } from 'xcode';

import { ConfigPlugin } from '../Plugin.types';
import { withXcodeProject } from '../plugins/ios-plugins';
import { addWarningIOS } from '../utils/warnings';
import { isNotComment } from './utils/Xcodeproj';

export const withBitcode: ConfigPlugin = config => {
  return withXcodeProject(config, async config => {
    config.modResults = await setBitcode(config, {
      project: config.modResults,
    });
    return config;
  });
};

export function getBitcode(config: Pick<ExpoConfig, 'ios'>): boolean | string {
  // @ts-ignore: TODO
  return config.ios?.bitcode ?? true;
}

/**
 * Enable or disable the `ENABLE_BITCODE` property of the project configurations.
 */
export function setBitcode(
  config: Pick<ExpoConfig, 'ios'>,
  { project }: { project: XcodeProject }
): XcodeProject {
  const bitcode = getBitcode(config);
  const targetName = typeof bitcode === 'string' ? bitcode : undefined;
  const isBitcodeEnabled = !!bitcode;

  if (targetName) {
    // Assert if missing
    const configs = Object.entries(project.pbxXCBuildConfigurationSection()).filter(isNotComment);
    const hasConfiguration = configs.find(([, configuration]) => configuration.name === targetName);
    if (hasConfiguration) {
      // If targetName is defined then disable bitcode everywhere.
      project.addBuildProperty('ENABLE_BITCODE', 'NO');
    } else {
      const names = [
        // Remove duplicates, wrap in double quotes, and sort alphabetically.
        ...new Set(configs.map(([, configuration]) => `"${configuration.name}"`)),
      ].sort();
      addWarningIOS(
        'ios.bitcode',
        `No configuration named "${targetName}". Expected one of: ${names.join(', ')}.`
      );
    }
  }

  project.addBuildProperty('ENABLE_BITCODE', isBitcodeEnabled ? 'YES' : 'NO', targetName);

  return project;
}
