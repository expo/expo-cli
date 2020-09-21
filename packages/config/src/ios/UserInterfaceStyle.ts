import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { withInfoPlist } from '../plugins/withPlist';
import { InfoPlist } from './IosConfig.types';

export function getUserInterfaceStyle(config: ExpoConfig): string | null {
  const result = config.ios?.userInterfaceStyle ?? config.userInterfaceStyle;
  return result ?? null;
}

export const withUserInterfaceStyle: ConfigPlugin = config =>
  withInfoPlist(config, setUserInterfaceStyle);

export function setUserInterfaceStyle(config: ExpoConfig, infoPlist: InfoPlist) {
  const userInterfaceStyle = getUserInterfaceStyle(config);
  const UIUserInterfaceStyle = _mapUserInterfaceStyleForInfoPlist(userInterfaceStyle);

  if (!UIUserInterfaceStyle) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    UIUserInterfaceStyle,
  };
}

function _mapUserInterfaceStyleForInfoPlist(userInterfaceStyle: string | null): string | null {
  switch (userInterfaceStyle) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    case 'automatic':
      return 'Automatic';
  }

  return null;
}
