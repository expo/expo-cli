import { AndroidConfig, ConfigPlugin, withStringsXml } from '@expo/config-plugins';

import { getAndroidSplashConfig } from './getAndroidSplashConfig';

const RESIZE_MODE_KEY = 'expo_splash_screen_resize_mode';
const STATUS_BAR_TRANSLUCENT_KEY = 'expo_splash_screen_status_bar_translucent';

export const withAndroidSplashStrings: ConfigPlugin = config => {
  config = withStringsXml(config, config => {
    const splashConfig = getAndroidSplashConfig(config);
    if (splashConfig) {
      const { resizeMode } = splashConfig;
      const statusBarTranslucent = !!config.androidStatusBar?.translucent;
      config.modResults = setSplashStrings(config.modResults, resizeMode, statusBarTranslucent);
    }
    return config;
  });
  return config;
};

export function setSplashStrings(
  strings: AndroidConfig.Resources.ResourceXML,
  resizeMode: string,
  statusBarTranslucent: boolean
): AndroidConfig.Resources.ResourceXML {
  let result = AndroidConfig.Strings.setStringItem(
    [
      AndroidConfig.Resources.buildResourceItem({
        name: RESIZE_MODE_KEY,
        value: resizeMode,
      }),
    ],
    strings
  );

  result = AndroidConfig.Strings.setStringItem(
    [
      AndroidConfig.Resources.buildResourceItem({
        name: STATUS_BAR_TRANSLUCENT_KEY,
        value: String(statusBarTranslucent),
      }),
    ],
    strings
  );

  return result;
}
