import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { removeColorItem, setColorItem } from './Colors';
import { buildResourceItem, ResourceXML } from './Resources';
import { removeStylesItem, setStylesItem } from './Styles';

const ANDROID_WINDOW_BACKGROUND = 'android:windowBackground';
const WINDOW_BACKGROUND_COLOR = 'activityBackground';

export const withRootViewBackgroundColor: ConfigPlugin = config => {
  config = withRootViewBackgroundColorColors(config);
  config = withRootViewBackgroundColorStyles(config);
  return config;
};

const withRootViewBackgroundColorColors: ConfigPlugin = config => {
  return withAndroidColors(config, async config => {
    config.modResults = setRootViewBackgroundColorColors(config, config.modResults);
    return config;
  });
};

const withRootViewBackgroundColorStyles: ConfigPlugin = config => {
  return withAndroidStyles(config, async config => {
    config.modResults = setRootViewBackgroundColorStyles(config, config.modResults);
    return config;
  });
};

export function setRootViewBackgroundColorColors(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>,
  colors: ResourceXML
) {
  const hexString = getRootViewBackgroundColor(config);

  if (!hexString) {
    return removeColorItem(WINDOW_BACKGROUND_COLOR, colors);
  }
  return setColorItem(
    buildResourceItem({ name: WINDOW_BACKGROUND_COLOR, value: hexString }),
    colors
  );
}

export function setRootViewBackgroundColorStyles(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>,
  styles: ResourceXML
) {
  const hexString = getRootViewBackgroundColor(config);
  const parent = { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' };
  if (!hexString) {
    return removeStylesItem({
      xml: styles,
      parent,
      name: ANDROID_WINDOW_BACKGROUND,
    });
  }

  return setStylesItem({
    xml: styles,
    parent,
    item: buildResourceItem({
      name: ANDROID_WINDOW_BACKGROUND,
      value: `@color/${WINDOW_BACKGROUND_COLOR}`,
    }),
  });
}

export function getRootViewBackgroundColor(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>
) {
  return config.android?.backgroundColor || config.backgroundColor || null;
}
