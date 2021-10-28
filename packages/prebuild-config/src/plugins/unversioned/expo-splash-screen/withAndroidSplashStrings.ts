import { AndroidConfig, ConfigPlugin, withStringsXml } from '@expo/config-plugins';

import { getAndroidSplashConfig } from './getAndroidSplashConfig';

const RESIZE_MODE_KEY = 'expo_splash_screen_resize_mode';
const STATUS_BAR_TRANSLUCENT_KEY = 'expo_splash_screen_status_bar_translucent';
const USER_INTERFACE_STYLE_KEY = 'expo_splash_screen_user_interface_style';

export const withAndroidSplashStrings: ConfigPlugin = config => {
  return withStringsXml(config, config => {
    const splashConfig = getAndroidSplashConfig(config);
    if (splashConfig) {
      const { resizeMode } = splashConfig;
      const statusBarTranslucent = !!config.androidStatusBar?.translucent;
      const userInterfaceStyle =
        config.android?.userInterfaceStyle ?? config.userInterfaceStyle ?? 'light';
      config.modResults = setSplashStrings(
        config.modResults,
        resizeMode,
        statusBarTranslucent,
        userInterfaceStyle
      );
    }
    return config;
  });
};

export function setSplashStrings(
  strings: AndroidConfig.Resources.ResourceXML,
  resizeMode: string,
  statusBarTranslucent: boolean,
  userInterfaceStyle: string
): AndroidConfig.Resources.ResourceXML {
  return AndroidConfig.Strings.setStringItem(
    [
      AndroidConfig.Resources.buildResourceItem({
        name: RESIZE_MODE_KEY,
        value: resizeMode,
        translatable: false,
      }),
      AndroidConfig.Resources.buildResourceItem({
        name: STATUS_BAR_TRANSLUCENT_KEY,
        value: String(statusBarTranslucent),
        translatable: false,
      }),
      AndroidConfig.Resources.buildResourceItem({
        name: USER_INTERFACE_STYLE_KEY,
        value: userInterfaceStyle,
        translatable: false,
      }),
    ],
    strings
  );
}
