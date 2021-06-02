import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidColors, withAndroidStyles } from '../plugins/android-plugins';
import { assignColorValue } from './Colors';
import { ResourceXML } from './Resources';
import { assignStylesValue, getAppThemeLightNoActionBarParent } from './Styles';

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
  colors: ResourceXML
): ResourceXML {
  return assignColorValue(colors, {
    name: COLOR_PRIMARY_KEY,
    value: getPrimaryColor(config),
  });
}

export function setPrimaryColorStyles(
  config: Pick<ExpoConfig, 'primaryColor'>,
  xml: ResourceXML
): ResourceXML {
  return assignStylesValue(xml, {
    add: !!getPrimaryColor(config),
    parent: getAppThemeLightNoActionBarParent(),
    name: COLOR_PRIMARY_KEY,
    value: `@color/${COLOR_PRIMARY_KEY}`,
  });
}
