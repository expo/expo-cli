import { ExpoConfig } from '../Config.types';
import { InfoPlist } from './IosConfig.types';

export function getCustomInfoPlistEntries(config: ExpoConfig) {
  return config.ios?.infoPlist ?? {};
}

export function setCustomInfoPlistEntries(config: ExpoConfig, infoPlist: InfoPlist) {
  const entries = getCustomInfoPlistEntries(config);

  return {
    ...infoPlist,
    ...entries,
  };
}
