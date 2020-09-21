import { ConfigPlugin, ExpoConfig } from '../Config.types';

export function getBranchApiKey(config: ExpoConfig) {
  return config.ios?.config?.branch?.apiKey ?? null;
}

export const withBranch: ConfigPlugin = ({ expo, ...config }) => {
  if (!expo.ios) {
    expo.ios = {};
  }
  if (!expo.ios.infoPlist) {
    expo.ios.infoPlist = {};
  }

  const apiKey = getBranchApiKey(expo);

  if (apiKey !== null) {
    expo.ios.infoPlist.branch_key = {
      live: apiKey,
    };
  } else {
    delete expo.ios.infoPlist.branch_key;
  }

  return { expo, ...config };
};
