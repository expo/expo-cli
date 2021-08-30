import { ExpoConfig } from '@expo/config-types';

import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';

export const withVersion = createInfoPlistPlugin(setVersion, 'withVersion');

export const withBuildNumber = createInfoPlistPlugin(setBuildNumber, 'withBuildNumber');

export function getVersion(config: Pick<ExpoConfig, 'version'>) {
  // TODO-JJ import this from  @expo/config once new version is published
  return config.version || '1.0.0';
}

export function setVersion(config: Pick<ExpoConfig, 'version'>, infoPlist: InfoPlist): InfoPlist {
  return {
    ...infoPlist,
    CFBundleShortVersionString: getVersion(config),
  };
}

export function getBuildNumber(config: Pick<ExpoConfig, 'ios'>) {
  // TODO-JJ import this from  @expo/config once new version is published
  return config.ios?.buildNumber ? config.ios.buildNumber : '1';
}

export function setBuildNumber(config: Pick<ExpoConfig, 'ios'>, infoPlist: InfoPlist): InfoPlist {
  return {
    ...infoPlist,
    CFBundleVersion: getBuildNumber(config),
  };
}
