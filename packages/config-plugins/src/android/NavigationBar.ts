import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import * as WarningAggregator from '../utils/warnings';
import { setColorItem } from './Colors';
import { buildResourceItem, ResourceXML } from './Resources';
import { setStylesItem } from './Styles';

const NAVIGATION_BAR_COLOR = 'navigationBarColor';
const WINDOW_LIGHT_NAVIGATION_BAR = 'android:windowLightNavigationBar';

export const withNavigationBar: ConfigPlugin = config => {
  const immersiveMode = getNavigationBarImmersiveMode(config);
  if (immersiveMode) {
    // Immersive mode needs to be set programatically
    WarningAggregator.addWarningAndroid(
      'androidNavigationBar.visible',
      'Hiding the navigation bar must be done programmatically. Refer to the Android documentation - https://developer.android.com/training/system-ui/immersive - for instructions.'
    );
  }

  config = withNavigationBarColors(config);
  config = withNavigationBarStyles(config);
  return config;
};

const withNavigationBarColors: ConfigPlugin = config =>
  withAndroidColors(config, config => {
    config.modResults = setNavigationBarColors(config, config.modResults);
    return config;
  });

const withNavigationBarStyles: ConfigPlugin = config =>
  withAndroidStyles(config, config => {
    config.modResults = setNavigationBarStyles(config, config.modResults);
    return config;
  });

export function setNavigationBarColors(
  config: Pick<ExpoConfig, 'androidNavigationBar'>,
  colorsJSON: ResourceXML
): ResourceXML {
  const hexString = getNavigationBarColor(config);
  if (hexString) {
    const colorItemToAdd = buildResourceItem({ name: NAVIGATION_BAR_COLOR, value: hexString });
    colorsJSON = setColorItem(colorItemToAdd, colorsJSON);
  }
  return colorsJSON;
}

export function setNavigationBarStyles(
  config: Pick<ExpoConfig, 'androidNavigationBar'>,
  stylesJSON: ResourceXML
): ResourceXML {
  const hexString = getNavigationBarColor(config);
  const barStyle = getNavigationBarStyle(config);

  if (hexString) {
    const styleItemToAdd = buildResourceItem({
      name: `android:${NAVIGATION_BAR_COLOR}`,
      value: `@color/${NAVIGATION_BAR_COLOR}`,
    });
    stylesJSON = setStylesItem({
      item: styleItemToAdd,
      xml: stylesJSON,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }

  if (barStyle === 'dark-content') {
    const navigationBarStyleItem = buildResourceItem({
      name: WINDOW_LIGHT_NAVIGATION_BAR,
      value: 'true',
    });
    stylesJSON = setStylesItem({
      item: navigationBarStyleItem,
      xml: stylesJSON,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }

  return stylesJSON;
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
