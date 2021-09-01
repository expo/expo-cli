import { ExpoConfig } from '@expo/config-types';

import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';

export const withVersion = createInfoPlistPlugin(setVersion, 'withVersion');

export const withBuildNumber = createInfoPlistPlugin(setBuildNumber, 'withBuildNumber');

export function getVersion(config: Pick<ExpoConfig, 'version'>) {
  return config.version;
}

export function setVersion(config: Pick<ExpoConfig, 'version'>, infoPlist: InfoPlist): InfoPlist {
  return {
    ...infoPlist,
    CFBundleShortVersionString: getVersion(config),
  };
}

export function getBuildNumber(config: Pick<ExpoConfig, 'ios'>) {
  return config.ios?.buildNumber;
}

export function setBuildNumber(config: Pick<ExpoConfig, 'ios'>, infoPlist: InfoPlist): InfoPlist {
  return {
    ...infoPlist,
    CFBundleVersion: getBuildNumber(config),
  };
}
