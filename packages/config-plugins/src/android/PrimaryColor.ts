import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { removeColorItem, setColorItem } from './Colors';
import { buildResourceItem, ResourceXML } from './Resources';
import { removeStylesItem, setStylesItem } from './Styles';

const COLOR_PRIMARY_KEY = 'colorPrimary';
const DEFAULT_PRIMARY_COLOR = '#023c69';

export const withPrimaryColor: ConfigPlugin = config => {
  config = withPrimaryColorColors(config);
  config = withPrimaryColorStyles(config);
  return config;
};

const withPrimaryColorColors: ConfigPlugin = config => {
  return withAndroidColors(config, config => {
    config.modResults = setPrimaryColorColors(config, config.modResults);
    return config;
  });
};

const withPrimaryColorStyles: ConfigPlugin = config => {
  return withAndroidStyles(config, config => {
    config.modResults = setPrimaryColorStyles(config, config.modResults);
    return config;
  });
};

export function getPrimaryColor(config: Pick<ExpoConfig, 'primaryColor'>) {
  return config.primaryColor ?? DEFAULT_PRIMARY_COLOR;
}

export function setPrimaryColorColors(
  config: Pick<ExpoConfig, 'primaryColor'>,
  xml: ResourceXML
): ResourceXML {
  const hexString = getPrimaryColor(config);
  if (!hexString) {
    return removeColorItem(COLOR_PRIMARY_KEY, xml);
  }
  return setColorItem(buildResourceItem({ name: COLOR_PRIMARY_KEY, value: hexString }), xml);
}

export function setPrimaryColorStyles(
  config: Pick<ExpoConfig, 'primaryColor'>,
  xml: ResourceXML
): ResourceXML {
  const hexString = getPrimaryColor(config);
  const parent = { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' };
  if (!hexString) {
    return removeStylesItem({
      xml,
      parent,
      name: COLOR_PRIMARY_KEY,
    });
  }

  return setStylesItem({
    xml,
    parent,
    item: buildResourceItem({
      name: COLOR_PRIMARY_KEY,
      value: `@color/${COLOR_PRIMARY_KEY}`,
    }),
  });
}
