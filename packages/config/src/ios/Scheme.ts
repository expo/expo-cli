import { InfoPlist } from './IosConfig.types';
import { ExpoConfig } from '../Config.types';

export function getScheme(config: ExpoConfig) {
  return typeof config.scheme === 'string' ? config.scheme : null;
}

// TODO: maybe add a function for appending scheme?
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
