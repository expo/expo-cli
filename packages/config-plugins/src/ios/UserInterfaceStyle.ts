import { ExpoConfig } from '@expo/config-types';

import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { InfoPlist, InterfaceStyle } from './IosConfig.types';

export const withUserInterfaceStyle = createInfoPlistPlugin(
  setUserInterfaceStyle,
  'withUserInterfaceStyle'
);

export function getUserInterfaceStyle(
  config: Pick<ExpoConfig, 'ios' | 'userInterfaceStyle'>
): string {
  return config.ios?.userInterfaceStyle ?? config.userInterfaceStyle ?? 'light';
}

export function setUserInterfaceStyle(
  config: Pick<ExpoConfig, 'ios' | 'userInterfaceStyle'>,
  { UIUserInterfaceStyle, ...infoPlist }: InfoPlist
): InfoPlist {
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

function mapUserInterfaceStyleForInfoPlist(userInterfaceStyle: string): InterfaceStyle | null {
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
