import { ExpoConfig } from '@expo/config-types';

import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';

export const withBranch = createInfoPlistPlugin(setBranchApiKey, 'withBranch');

export function getBranchApiKey(config: Pick<ExpoConfig, 'ios'>) {
  return config.ios?.config?.branch?.apiKey ?? null;
}

export function setBranchApiKey(config: Pick<ExpoConfig, 'ios'>, infoPlist: InfoPlist): InfoPlist {
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
