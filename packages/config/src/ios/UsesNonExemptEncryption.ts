import { InfoPlist } from './IosConfig.types';
import { ExpoConfig } from '../Config.types';

export function getUsesNonExemptEncryption(config: ExpoConfig) {
  return config.ios?.config?.hasOwnProperty('usesNonExemptEncryption')
    ? !!config.ios.config.usesNonExemptEncryption
    : null;
}

export function setUsesNonExemptEncryption(config: ExpoConfig, infoPlist: InfoPlist) {
  let usesNonExemptEncryption = getUsesNonExemptEncryption(config);

  // Make no changes if the key is left blank
  if (usesNonExemptEncryption === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    ITSAppUsesNonExemptEncryption: usesNonExemptEncryption,
  };
}
