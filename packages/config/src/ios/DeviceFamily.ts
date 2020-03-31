import fs from 'fs-extra';

import { ExpoConfig } from '../Config.types';
import { getPbxproj, isBuildConfig, removeComments, removeTestHosts } from './utils/Xcodeproj';
import { addWarningIOS } from '../WarningAggregator';

export function getSupportsTablet(config: ExpoConfig) {
  if (config.ios?.supportsTablet) {
    return config.ios?.supportsTablet;
  }

  return false;
}

export function getIsTabletOnly(config: ExpoConfig) {
  if (config.ios?.isTabletOnly) {
    return config.ios.isTabletOnly;
  }

  return false;
}

export function getDeviceFamilies(config: ExpoConfig) {
  let supportsTablet = getSupportsTablet(config);
  let isTabletOnly = getIsTabletOnly(config);

  // 1 is iPhone, 2 is iPad
  if (isTabletOnly) {
    return [2];
  } else if (supportsTablet) {
    return [1, 2];
  } else {
    return [1];
  }
}

/**
 * Add to pbxproj under TARGETED_DEVICE_FAMILY
 */
export function setDeviceFamily(config: ExpoConfig, projectRoot: string) {
  const deviceFamilies = getDeviceFamilies(config);

  let supportsTablet = getSupportsTablet(config);
  let isTabletOnly = getIsTabletOnly(config);

  if (isTabletOnly) {
    addWarningIOS(
      'isTabletOnly',
      'You will need to configure this in the "General" tab for your project target in Xcode.'
    );
  } else if (supportsTablet) {
    addWarningIOS(
      'supportsTablet',
      'You will need to configure this in the "General" tab for your project target in Xcode.'
    );
  }

  // TODO: we might need to actually fork the "xcode" package to make this work
  // See: https://github.com/apache/cordova-node-xcode/issues/86
  //
  // const project = getPbxproj(projectRoot);
  // Object.entries(project.pbxXCBuildConfigurationSection())
  //   .filter(removeComments)
  //   .filter(isBuildConfig)
  //   .filter(removeTestHosts)
  //   .forEach(({ 1: { buildSettings } }: any) => {
  //     buildSettings.TARGETED_DEVICE_FAMILY = '1';
  //   });
  // fs.writeFileSync(project.filepath, project.writeSync());
}
