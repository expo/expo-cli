import { XcodeProject } from 'xcode';

import { ExpoConfig } from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';

export function getSupportsTablet(config: ExpoConfig): boolean {
  return !!config.ios?.supportsTablet;
}

export function getIsTabletOnly(config: ExpoConfig): boolean {
  return !!config?.ios?.isTabletOnly;
}

export function getDeviceFamilies(config: ExpoConfig): number[] {
  const supportsTablet = getSupportsTablet(config);
  const isTabletOnly = getIsTabletOnly(config);

  if (isTabletOnly && config.ios?.supportsTablet === false) {
    addWarningIOS(
      'device-family',
      `Found contradictory values: \`{ ios: { isTabletOnly: true, supportsTablet: false } }\`. Using \`{ isTabletOnly: true }\`.`
    );
  }

  // 1 is iPhone, 2 is iPad
  if (isTabletOnly) {
    return [2];
  } else if (supportsTablet) {
    return [1, 2];
  } else {
    // is iPhone only
    return [1];
  }
}

/**
 * Wrapping the families in double quotes is the only way to set a value with a comma in it.
 *
 * @param deviceFamilies
 */
export function formatDeviceFamilies(deviceFamilies: number[]): string {
  return `"${deviceFamilies.join(',')}"`;
}

/**
 * Add to pbxproj under TARGETED_DEVICE_FAMILY
 */
export function setDeviceFamily(
  config: ExpoConfig,
  { project }: { project: XcodeProject }
): XcodeProject {
  const deviceFamilies = formatDeviceFamilies(getDeviceFamilies(config));

  const configurations = project.pbxXCBuildConfigurationSection();
  // @ts-ignore
  for (const { buildSettings } of Object.values(configurations || {})) {
    // Guessing that this is the best way to emulate Xcode.
    // Using `project.addToBuildSettings` modifies too many targets.
    if (typeof buildSettings?.PRODUCT_NAME !== 'undefined') {
      buildSettings.TARGETED_DEVICE_FAMILY = deviceFamilies;
    }
  }

  return project;
}
