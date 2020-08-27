import { ExpoConfig } from '../Config.types';
import { InfoPlist } from './IosConfig.types';

export function getBranchApiKey(config: ExpoConfig) {
  return config.ios?.config?.branch?.apiKey ?? null;
}

export function setBranchApiKey(config: ExpoConfig, infoPlist: InfoPlist) {
  const apiKey = getBranchApiKey(config);

  if (apiKey === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    branch_key: {
      live: apiKey,
    },
  };
}
