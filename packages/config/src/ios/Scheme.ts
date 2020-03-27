import { InfoPlist } from './IosConfig.types';
import { ExpoConfig } from '../Config.types';

export function getScheme(config: ExpoConfig) {
  return typeof config.scheme === 'string' ? config.scheme : null;
}

export function setScheme(config: ExpoConfig, infoPlist: InfoPlist): InfoPlist {
  let scheme = getScheme(config);
  if (!scheme) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    CFBundleURLTypes: [{ CFBundleURLSchemes: [scheme] }],
  };
}

// TODO: update this to work well idempotently!
export function appendScheme(scheme: string | null, infoPlist: InfoPlist): InfoPlist {
  if (!scheme) {
    return infoPlist;
  }

  let existingSchemes = infoPlist.CFBundleURLTypes;

  // No need to append if we don't have any
  if (!existingSchemes) {
    return setScheme({ scheme }, infoPlist);
  }

  return {
    ...infoPlist,
    CFBundleURLTypes: [
      ...existingSchemes,
      {
        CFBundleURLSchemes: [scheme],
      },
    ],
  };
}
