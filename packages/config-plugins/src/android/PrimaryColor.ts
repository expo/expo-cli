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

const withPrimaryColorColors: ConfigPlugin = config =>
  withAndroidColors(config, config => {
    config.modResults = setPrimaryColorColors(config, config.modResults);
    return config;
  });

const withPrimaryColorStyles: ConfigPlugin = config =>
  withAndroidStyles(config, config => {
    config.modResults = setPrimaryColorStyles(config, config.modResults);
    return config;
  });

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
  const item = buildResourceItem({ name: COLOR_PRIMARY_KEY, value: hexString });
  return setColorItem(item, xml);
}

export function setPrimaryColorStyles(
  config: Pick<ExpoConfig, 'primaryColor'>,
  xml: ResourceXML
): ResourceXML {
  const hexString = getPrimaryColor(config);
  if (!hexString) {
    return removeStylesItem({
      name: COLOR_PRIMARY_KEY,
      xml,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }

  return setStylesItem({
    item: buildResourceItem({ name: COLOR_PRIMARY_KEY, value: `@color/${COLOR_PRIMARY_KEY}` }),
    xml,
    parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
  });
}
