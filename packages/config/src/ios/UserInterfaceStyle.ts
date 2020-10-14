import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { withInfoPlist } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';

export function getUserInterfaceStyle(config: ExpoConfig): string | null {
  return config.ios?.userInterfaceStyle ?? config.userInterfaceStyle ?? null;
}

export const withUserInterfaceStyle: ConfigPlugin = config =>
  withInfoPlist(config, setUserInterfaceStyle);

export function setUserInterfaceStyle(
  config: ExpoConfig,
  { UIUserInterfaceStyle, ...infoPlist }: InfoPlist
) {
  const userInterfaceStyle = getUserInterfaceStyle(config);
  const style = mapUserInterfaceStyleForInfoPlist(userInterfaceStyle);

  if (!style) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    UIUserInterfaceStyle: style,
  };
}

function mapUserInterfaceStyleForInfoPlist(userInterfaceStyle: string | null): string | null {
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
