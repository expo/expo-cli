import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { withInfoPlist } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';

export const withBranch: ConfigPlugin = config => withInfoPlist(config, setBranchApiKey);

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
