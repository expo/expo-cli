import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { assignColorValue } from './Colors';
import { ResourceXML } from './Resources';
import { assignStylesValue, getAppThemeLightNoActionBarGroup } from './Styles';

const COLOR_PRIMARY_DARK_KEY = 'colorPrimaryDark';
const WINDOW_TRANSLUCENT_STATUS = 'android:windowTranslucentStatus';
const WINDOW_LIGHT_STATUS_BAR = 'android:windowLightStatusBar';

export const withStatusBar: ConfigPlugin = config => {
  config = withStatusBarColors(config);
  config = withStatusBarStyles(config);
  return config;
};

const withStatusBarColors: ConfigPlugin = config => {
  return withAndroidColors(config, async config => {
    config.modResults = setStatusBarColors(config, config.modResults);
    return config;
  });
};

const withStatusBarStyles: ConfigPlugin = config => {
  return withAndroidStyles(config, async config => {
    config.modResults = setStatusBarStyles(config, config.modResults);
    return config;
  });
};

export function setStatusBarColors(
  config: Pick<ExpoConfig, 'androidStatusBar'>,
  colors: ResourceXML
): ResourceXML {
  return assignColorValue(colors, {
    name: COLOR_PRIMARY_DARK_KEY,
    value: config.androidStatusBar?.backgroundColor,
  });
}

export function setStatusBarStyles(
  config: Pick<ExpoConfig, 'androidStatusBar'>,
  styles: ResourceXML
): ResourceXML {
  const hexString = getStatusBarColor(config);

  styles = assignStylesValue(styles, {
    parent: getAppThemeLightNoActionBarGroup(),
    name: WINDOW_LIGHT_STATUS_BAR,
    value: 'true',
    // Default is light-content, don't need to do anything to set it
    add: getStatusBarStyle(config) === 'dark-content',
  });

  styles = assignStylesValue(styles, {
    parent: getAppThemeLightNoActionBarGroup(),
    name: WINDOW_TRANSLUCENT_STATUS,
    value: 'true',
    // translucent status bar set in theme
    add: hexString === 'translucent',
  });

  styles = assignStylesValue(styles, {
    parent: getAppThemeLightNoActionBarGroup(),
    name: COLOR_PRIMARY_DARK_KEY,
    value: `@color/${COLOR_PRIMARY_DARK_KEY}`,
    // Remove the color if translucent is used
    add: hexString !== 'translucent',
  });

  return styles;
}

export function getStatusBarColor(config: Pick<ExpoConfig, 'androidStatusBar'>) {
  return config.androidStatusBar?.backgroundColor || 'translucent';
}

export function getStatusBarStyle(config: Pick<ExpoConfig, 'androidStatusBar'>) {
  return config.androidStatusBar?.barStyle || 'light-content';
}
