import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { withInfoPlist } from '../plugins/withPlist';
import { InfoPlist } from './IosConfig.types';

export function getVersion(config: ExpoConfig) {
  return config.version || '0.0.0';
}

export const withVersion: ConfigPlugin = config => withInfoPlist(config, setVersion);

export function setVersion(config: ExpoConfig, infoPlist: InfoPlist) {
  return {
    ...infoPlist,
    CFBundleShortVersionString: getVersion(config),
  };
}

export function getBuildNumber(config: ExpoConfig) {
  return config.ios && config.ios.buildNumber ? config.ios.buildNumber : '1';
}

export const withBuildNumber: ConfigPlugin = config => withInfoPlist(config, setBuildNumber);

export function setBuildNumber(config: ExpoConfig, infoPlist: InfoPlist) {
  return {
    ...infoPlist,
    CFBundleVersion: getBuildNumber(config),
  };
}
