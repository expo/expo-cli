import { ExpoConfig } from '@expo/config-types';

import { InfoPlist } from './IosConfig.types';

export function getCustomInfoPlistEntries(config: Pick<ExpoConfig, 'ios'>) {
  return config.ios?.infoPlist ?? {};
}

export function setCustomInfoPlistEntries(
  config: Pick<ExpoConfig, 'ios'>,
  infoPlist: InfoPlist
): InfoPlist {
  const entries = getCustomInfoPlistEntries(config);

  return {
    ...infoPlist,
    ...entries,
  };
}
