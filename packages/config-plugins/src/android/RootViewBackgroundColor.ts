import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { assignColorValue } from './Colors';
import { ResourceXML } from './Resources';
import { assignStylesValue, getAppThemeLightNoActionBarGroup } from './Styles';

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
  return assignColorValue(colors, {
    value: getRootViewBackgroundColor(config),
    name: WINDOW_BACKGROUND_COLOR,
  });
}

export function setRootViewBackgroundColorStyles(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>,
  styles: ResourceXML
) {
  return assignStylesValue(styles, {
    add: !!getRootViewBackgroundColor(config),
    parent: getAppThemeLightNoActionBarGroup(),
    name: ANDROID_WINDOW_BACKGROUND,
    value: `@color/${WINDOW_BACKGROUND_COLOR}`,
  });
}

export function getRootViewBackgroundColor(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>
) {
  return config.android?.backgroundColor || config.backgroundColor || null;
}
