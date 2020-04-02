import { ExpoConfig } from '../Config.types';
import { InfoPlist } from './IosConfig.types';

export function getVersion(config: ExpoConfig) {
  return config.version ? config.version : '0.0.0';
}

export function setVersion(config: ExpoConfig, infoPlist: InfoPlist) {
  return {
    ...infoPlist,
    CFBundleShortVersionString: getVersion(config),
  };
}

export function getBuildNumber(config: ExpoConfig) {
  return config.ios && config.ios.buildNumber ? config.ios.buildNumber : '1';
}

export function setBuildNumber(config: ExpoConfig, infoPlist: InfoPlist) {
  return {
    ...infoPlist,
    CFBundleVersion: getBuildNumber(config),
  };
}
