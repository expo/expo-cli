import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { assignColorValue } from './Colors';
import { assignStylesValue, getAppThemeLightNoActionBarGroup } from './Styles';

const ANDROID_WINDOW_BACKGROUND = 'android:windowBackground';
const WINDOW_BACKGROUND_COLOR = 'activityBackground';

export const withRootViewBackgroundColor: ConfigPlugin = config => {
  config = withRootViewBackgroundColorColors(config);
  config = withRootViewBackgroundColorStyles(config);
  return config;
};

export const withRootViewBackgroundColorColors: ConfigPlugin = config => {
  return withAndroidColors(config, async config => {
    config.modResults = assignColorValue(config.modResults, {
      value: getRootViewBackgroundColor(config),
      name: WINDOW_BACKGROUND_COLOR,
    });
    return config;
  });
};

export const withRootViewBackgroundColorStyles: ConfigPlugin = config => {
  return withAndroidStyles(config, async config => {
    config.modResults = assignStylesValue(config.modResults, {
      add: !!getRootViewBackgroundColor(config),
      parent: getAppThemeLightNoActionBarGroup(),
      name: ANDROID_WINDOW_BACKGROUND,
      value: `@color/${WINDOW_BACKGROUND_COLOR}`,
    });
    return config;
  });
};

export function getRootViewBackgroundColor(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>
) {
  return config.android?.backgroundColor || config.backgroundColor || null;
}
