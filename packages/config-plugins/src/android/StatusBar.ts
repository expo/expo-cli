import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { assignColorValue } from './Colors';
import { buildResourceItem, ResourceXML } from './Resources';
import { removeStylesItem, setStylesItem } from './Styles';

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
  const style = getStatusBarStyle(config);
  const hexString = getStatusBarColor(config);

  const parent = { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' };

  // Default is light-content, don't need to do anything to set it
  if (style === 'dark-content') {
    styles = setStylesItem({
      xml: styles,
      parent,
      item: buildResourceItem({
        name: WINDOW_LIGHT_STATUS_BAR,
        value: `true`,
      }),
    });
  } else {
    styles = removeStylesItem({
      xml: styles,
      parent,
      name: WINDOW_LIGHT_STATUS_BAR,
    });
  }

  if (hexString === 'translucent') {
    styles = removeStylesItem({
      xml: styles,
      parent,
      name: COLOR_PRIMARY_DARK_KEY,
    });
    // translucent status bar set in theme
    styles = setStylesItem({
      xml: styles,
      parent,
      item: buildResourceItem({
        name: WINDOW_TRANSLUCENT_STATUS,
        value: 'true',
      }),
    });
  } else {
    styles = removeStylesItem({
      xml: styles,
      parent,
      name: WINDOW_TRANSLUCENT_STATUS,
    });
    styles = setStylesItem({
      xml: styles,
      parent,
      item: buildResourceItem({
        name: COLOR_PRIMARY_DARK_KEY,
        value: `@color/${COLOR_PRIMARY_DARK_KEY}`,
      }),
    });
  }

  return styles;
}

export function getStatusBarColor(config: Pick<ExpoConfig, 'androidStatusBar'>) {
  return config.androidStatusBar?.backgroundColor || 'translucent';
}

export function getStatusBarStyle(config: Pick<ExpoConfig, 'androidStatusBar'>) {
  return config.androidStatusBar?.barStyle || 'light-content';
}
