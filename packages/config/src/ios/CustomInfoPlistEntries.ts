import { ExpoConfig } from '../Config.types';
import { InfoPlist } from './IosConfig.types';

export function getCustomInfoPlistEntries(config: ExpoConfig) {
  return config.ios && config.ios.infoPlist ? config.ios.infoPlist : {};
}

export function setCustomInfoPlistEntries(config: ExpoConfig, infoPlist: InfoPlist) {
  let entries = getCustomInfoPlistEntries(config);

  return {
    ...infoPlist,
    ...entries,
  };
}
