import { ExpoConfig } from '../Config.types';
import { InfoPlist } from './IosConfig.types';

export function getUsesNonExemptEncryption(config: ExpoConfig) {
  return config?.ios?.config?.usesNonExemptEncryption ?? null;
}

export function setUsesNonExemptEncryption(
  config: ExpoConfig,
  { ITSAppUsesNonExemptEncryption, ...infoPlist }: InfoPlist
) {
  const usesNonExemptEncryption = getUsesNonExemptEncryption(config);

  // Make no changes if the key is left blank
  if (usesNonExemptEncryption === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    ITSAppUsesNonExemptEncryption: usesNonExemptEncryption,
  };
}
