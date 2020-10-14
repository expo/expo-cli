import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { withInfoPlist } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';

export const withDisplayName: ConfigPlugin = config => withInfoPlist(config, setDisplayName);

export const withName: ConfigPlugin = config => withInfoPlist(config, setName);

export function getName(config: ExpoConfig) {
  return typeof config.name === 'string' ? config.name : null;
}

/**
 * CFBundleDisplayName is used for most things: the name on the home screen, in
 * notifications, and others.
 */
export function setDisplayName(
  configOrName: ExpoConfig | string,
  { CFBundleDisplayName, ...infoPlist }: InfoPlist
) {
  let name: string | null = null;
  if (typeof configOrName === 'string') {
    name = configOrName;
  } else {
    name = getName(configOrName);
  }

  if (!name) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    CFBundleDisplayName: name,
  };
}

/**
 * CFBundleName is recommended to be 16 chars or less and is used in lists, eg:
 * sometimes on the App Store
 */
export function setName(config: ExpoConfig, { CFBundleName, ...infoPlist }: InfoPlist) {
  const name = getName(config);

  if (!name) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    CFBundleName: name,
  };
}
