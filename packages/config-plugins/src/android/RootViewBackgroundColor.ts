import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withColorsXml, withStylesXml } from '../plugins/android-plugins';
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
  return withColorsXml(config, async config => {
    config.modResults.main = setRootViewBackgroundColorColors(props, config.modResults.main);
    return config;
  });
};

const withRootViewBackgroundColorStyles: ConfigPlugin<{ hexString: string | null }> = (
  config,
  props
) => {
  return withStylesXml(config, async config => {
    config.modResults.main = setRootViewBackgroundColorStyles(props, config.modResults.main);
    return config;
  });
};

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

function setRootViewBackgroundColorColors(
  { hexString }: { hexString: string | null },
  colorsJSON: ResourceXML
) {
  if (!hexString) {
    return removeColorItem(WINDOW_BACKGROUND_COLOR, colorsJSON);
  }
  const colorItemToAdd = buildResourceItem({ name: WINDOW_BACKGROUND_COLOR, value: hexString });
  return setColorItem(colorItemToAdd, colorsJSON);
}

function setRootViewBackgroundColorStyles(
  { hexString }: { hexString: string | null },
  stylesJSON: ResourceXML
) {
  if (!hexString) {
    return removeStylesItem({
      item: ANDROID_WINDOW_BACKGROUND,
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
