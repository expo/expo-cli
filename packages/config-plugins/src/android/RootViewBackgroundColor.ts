import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { removeColorItem, setColorItem } from './Colors';
import { buildResourceItem, ResourceXML } from './Resources';
import { removeStylesItem, setStylesItem } from './Styles';

const ANDROID_WINDOW_BACKGROUND = 'android:windowBackground';
const WINDOW_BACKGROUND_COLOR = 'activityBackground';

export const withRootViewBackgroundColor: ConfigPlugin = config => {
  const hexString = getRootViewBackgroundColor(config);
  config = withRootViewBackgroundColorColors(config, { hexString });
  config = withRootViewBackgroundColorStyles(config, { hexString });
  return config;
};

const withRootViewBackgroundColorColors: ConfigPlugin<{ hexString: string | null }> = (
  config,
  props
) => {
  return withAndroidColors(config, async config => {
    config.modResults = setRootViewBackgroundColorColors(props, config.modResults);
    return config;
  });
};

const withRootViewBackgroundColorStyles: ConfigPlugin<{ hexString: string | null }> = (
  config,
  props
) => {
  return withAndroidStyles(config, async config => {
    config.modResults = setRootViewBackgroundColorStyles(props, config.modResults);
    return config;
  });
};

export function setRootViewBackgroundColorColors(
  { hexString }: { hexString: string | null },
  colorsJSON: ResourceXML
) {
  if (!hexString) {
    return removeColorItem(WINDOW_BACKGROUND_COLOR, colorsJSON);
  }
  const colorItemToAdd = buildResourceItem({ name: WINDOW_BACKGROUND_COLOR, value: hexString });
  return setColorItem(colorItemToAdd, colorsJSON);
}

export function setRootViewBackgroundColorStyles(
  { hexString }: { hexString: string | null },
  stylesJSON: ResourceXML
) {
  if (!hexString) {
    return removeStylesItem({
      name: ANDROID_WINDOW_BACKGROUND,
      xml: stylesJSON,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }
  const styleItemToAdd = buildResourceItem({
    name: ANDROID_WINDOW_BACKGROUND,
    value: `@color/${WINDOW_BACKGROUND_COLOR}`,
  });
  return setStylesItem({
    item: styleItemToAdd,
    xml: stylesJSON,
    parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
  });
}

export function getRootViewBackgroundColor(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>
) {
  if (config.android?.backgroundColor) {
    return config.android.backgroundColor;
  }
  if (config.backgroundColor) {
    return config.backgroundColor;
  }

  return null;
}
