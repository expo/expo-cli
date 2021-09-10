import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { addWarningAndroid } from '../utils/warnings';
import { setColorItem } from './Colors';
import { buildResourceItem, ResourceXML } from './Resources';
import { assignStylesValue, getAppThemeLightNoActionBarGroup } from './Styles';

const NAVIGATION_BAR_COLOR = 'navigationBarColor';

export const withNavigationBar: ConfigPlugin = config => {
  const immersiveMode = getNavigationBarImmersiveMode(config);
  if (immersiveMode) {
    // Immersive mode needs to be set programmatically
    // TODO: Resolve
    addWarningAndroid(
      'androidNavigationBar.visible',
      'Hiding the navigation bar must be done programmatically',
      'https://developer.android.com/training/system-ui/immersive'
    );
  }

  config = withNavigationBarColors(config);
  config = withNavigationBarStyles(config);
  return config;
};

const withNavigationBarColors: ConfigPlugin = config => {
  return withAndroidColors(config, config => {
    config.modResults = setNavigationBarColors(config, config.modResults);
    return config;
  });
};

const withNavigationBarStyles: ConfigPlugin = config => {
  return withAndroidStyles(config, config => {
    config.modResults = setNavigationBarStyles(config, config.modResults);
    return config;
  });
};

export function setNavigationBarColors(
  config: Pick<ExpoConfig, 'androidNavigationBar'>,
  colors: ResourceXML
): ResourceXML {
  const hexString = getNavigationBarColor(config);
  if (hexString) {
    colors = setColorItem(
      buildResourceItem({
        name: NAVIGATION_BAR_COLOR,
        value: hexString,
      }),
      colors
    );
  }
  return colors;
}

export function setNavigationBarStyles(
  config: Pick<ExpoConfig, 'androidNavigationBar'>,
  styles: ResourceXML
): ResourceXML {
  styles = assignStylesValue(styles, {
    add: !!getNavigationBarColor(config),
    parent: getAppThemeLightNoActionBarGroup(),
    name: `android:${NAVIGATION_BAR_COLOR}`,
    value: `@color/${NAVIGATION_BAR_COLOR}`,
  });

  styles = assignStylesValue(styles, {
    add: getNavigationBarStyle(config) === 'dark-content',
    parent: getAppThemeLightNoActionBarGroup(),
    name: 'android:windowLightNavigationBar',
    value: 'true',
  });

  return styles;
}

export function getNavigationBarImmersiveMode(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.visible || null;
}

export function getNavigationBarColor(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.backgroundColor || null;
}

export function getNavigationBarStyle(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.barStyle || 'light-content';
}
