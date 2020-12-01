import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withColorsXml, withStylesXml } from '../plugins/android-plugins';
import * as WarningAggregator from '../utils/warnings';
import { removeColorItem, setColorItem } from './Colors';
import { buildResourceItem, ResourceXML } from './Resources';
import { setStylesItem } from './Styles';

const COLOR_PRIMARY_DARK_KEY = 'colorPrimaryDark';
const WINDOW_TRANSLUCENT_STATUS = 'android:windowTranslucentStatus';
const WINDOW_LIGHT_STATUS_BAR = 'android:windowLightStatusBar';

type Props = {
  hexString: string;
  style: NonNullable<NonNullable<ExpoConfig['androidStatusBar']>['barStyle']>;
};

export const withStatusBar: ConfigPlugin = config => {
  const props = {
    style: getStatusBarStyle(config),
    hexString: getStatusBarColor(config),
  };

  config = withStatusBarColors(config, props);
  config = withStatusBarStyles(config, props);

  return config;
};

const withStatusBarColors: ConfigPlugin<Props> = (config, props) => {
  return withColorsXml(config, async config => {
    config.modResults.main = setStatusBarColors(props, config.modResults.main);
    return config;
  });
};

const withStatusBarStyles: ConfigPlugin<Props> = (config, props) => {
  return withStylesXml(config, async config => {
    config.modResults.main = setStatusBarStyles(props, config.modResults.main);
    return config;
  });
};

export function setStatusBarColors({ hexString }: Props, xml: ResourceXML): ResourceXML {
  if (hexString === 'translucent') {
    return removeColorItem(COLOR_PRIMARY_DARK_KEY, xml);
  }
  // Need to add a color key to colors.xml to use in styles.xml
  const colorItemToAdd = buildResourceItem({ name: COLOR_PRIMARY_DARK_KEY, value: hexString });
  return setColorItem(colorItemToAdd, xml);
}

export function setStatusBarStyles({ hexString, style }: Props, xml: ResourceXML): ResourceXML {
  const parent = { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' };
  // Default is light-content, don't need to do anything to set it
  if (style === 'dark-content') {
    xml = setStylesItem({
      item: buildResourceItem({
        name: WINDOW_LIGHT_STATUS_BAR,
        value: `true`,
      }),
      xml,
      parent,
    });
  } else {
    // xml = removeStylesItem({
    //   xml,
    //   parent,
    //   item: WINDOW_LIGHT_STATUS_BAR,
    // });
  }

  if (hexString === 'translucent') {
    // xml = removeStylesItem({
    //   xml,
    //   parent,
    //   item: COLOR_PRIMARY_DARK_KEY,
    // });
    // translucent status bar set in theme
    xml = setStylesItem({
      item: buildResourceItem({ name: WINDOW_TRANSLUCENT_STATUS, value: 'true' }),
      xml,
      parent,
    });
  } else {
    // xml = removeStylesItem({
    //   xml,
    //   parent,
    //   item: WINDOW_TRANSLUCENT_STATUS,
    // });
    xml = setStylesItem({
      item: buildResourceItem({
        name: COLOR_PRIMARY_DARK_KEY,
        value: `@color/${COLOR_PRIMARY_DARK_KEY}`,
      }),
      xml,
      parent,
    });
  }

  return xml;
}

export function getStatusBarColor(
  config: Pick<ExpoConfig, 'androidStatusBarColor' | 'androidStatusBar'>
) {
  if (config.androidStatusBarColor != null) {
    WarningAggregator.addWarningAndroid(
      'status-bar',
      '`androidStatusBarColor` is deprecated, use `androidStatusBar.backgroundColor` instead.'
    );
  }
  return config.androidStatusBar?.backgroundColor || 'translucent';
}

export function getStatusBarStyle(config: Pick<ExpoConfig, 'androidStatusBar'>) {
  return config.androidStatusBar?.barStyle || 'light-content';
}
