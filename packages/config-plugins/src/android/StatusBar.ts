import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withDangerousMod } from '../plugins/withDangerousMod';
import { writeXMLAsync } from '../utils/XML';
import * as WarningAggregator from '../utils/warnings';
import { getProjectColorsXMLPathAsync, removeColorItem, setColorItem } from './Colors';
import { buildResourceItem, readResourcesXMLAsync, ResourceKind, ResourceXML } from './Resources';
import { getProjectStylesXMLPathAsync, removeStylesItem, setStylesItem } from './Styles';

const COLOR_PRIMARY_DARK_KEY = 'colorPrimaryDark';
const WINDOW_TRANSLUCENT_STATUS = 'android:windowTranslucentStatus';
const WINDOW_LIGHT_STATUS_BAR = 'android:windowLightStatusBar';

export const withStatusBar: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      await setStatusBarConfig(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

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

export function getStatusBarHidden(config: Pick<ExpoConfig, 'androidStatusBar'>): boolean | null {
  return config.androidStatusBar?.hidden ?? null;
}

export function getStatusBarTranslucent(
  config: Pick<ExpoConfig, 'androidStatusBar'>
): boolean | null {
  return config.androidStatusBar?.translucent ?? null;
}

const styleResourceGroup = {
  // Must use splash screen theme instead of AppTheme
  name: 'Theme.App.SplashScreen',
  parent: 'Theme.AppCompat.Light.NoActionBar',
};

export async function setStatusBarConfig(
  config: Pick<ExpoConfig, 'androidStatusBarColor' | 'androidStatusBar'>,
  projectRoot: string
) {
  // TODO: dark theme -- need to add it to the config first.
  const hexString = getStatusBarColor(config);
  const statusBarStyle = getStatusBarStyle(config);
  const statusBarHidden = getStatusBarHidden(config);
  const statusBarTranslucent = getStatusBarTranslucent(config);

  try {
    // TODO: use kind: values-night, values-night-v23, and values-v23
    await Promise.all([
      setStatusBarStylesForThemeAsync({
        projectRoot,
        kind: 'values',
        hidden: statusBarHidden,
        barStyle: statusBarStyle,
        translucent: statusBarTranslucent,
        // TODO: Make this not default to translucent
        addStatusBarBackgroundColor: !!hexString && hexString !== 'translucent',
      }),
      setStatusBarColorsForThemeAsync({
        projectRoot,
        kind: 'values',
        statusBarBackgroundColor: hexString === 'translucent' ? null : hexString,
      }),
    ]);
  } catch (e) {
    throw new Error(`Error setting Android status bar config: ${e.message}`);
  }
  return true;
}

export async function setStatusBarStylesForThemeAsync({
  projectRoot,
  kind,
  hidden,
  barStyle,
  translucent,
  // backgroundColor,
  addStatusBarBackgroundColor,
}: {
  projectRoot: string;
  kind?: ResourceKind;
  statusBarBackgroundColor?: string | null;
  hidden?: boolean | null;
  translucent?: boolean | null;
  barStyle?: 'light-content' | 'dark-content' | null;
  addStatusBarBackgroundColor?: boolean | null;
}): Promise<ResourceXML> {
  const stylesPath = await getProjectStylesXMLPathAsync(projectRoot, { kind });

  let xml = await readResourcesXMLAsync({ path: stylesPath });

  const parent = styleResourceGroup;

  // setStylesItem({
  //   xml,
  //   item: buildResourceItem({ name: 'android:windowBackground', value: '@drawable/splashscreen' }),
  //   parent,
  // });

  // TODO: Just guessing...
  if (translucent == null) {
    xml = removeStylesItem({ xml, name: WINDOW_TRANSLUCENT_STATUS, parent });
  } else {
    xml = setStylesItem({
      xml,
      item: buildResourceItem({ name: WINDOW_TRANSLUCENT_STATUS, value: String(translucent) }),
      parent,
    });
  }

  if (hidden == null) {
    xml = removeStylesItem({
      xml,
      name: 'android:windowFullscreen',
      parent,
    });
  } else {
    const hiddenItem = buildResourceItem({
      name: 'android:windowFullscreen',
      value: String(hidden),
    });
    xml = setStylesItem({
      xml,
      item: hiddenItem,
      parent,
    });
  }

  if (barStyle === undefined) {
    xml = removeStylesItem({ xml, name: WINDOW_LIGHT_STATUS_BAR, parent });
  } else {
    const windowLightStatusBarValue =
      barStyle === 'light-content' ? 'false' : barStyle === 'dark-content' ? 'true' : '';
    xml = setStylesItem({
      xml,
      item: buildResourceItem({
        name: WINDOW_LIGHT_STATUS_BAR,
        value: windowLightStatusBarValue,
      }),
      parent,
    });
  }

  if (!addStatusBarBackgroundColor) {
    xml = removeStylesItem({ xml, name: 'android:statusBarColor', parent });
  } else {
    xml = setStylesItem({
      xml,
      item: buildResourceItem({
        name: 'android:statusBarColor',
        value: `@color/${COLOR_PRIMARY_DARK_KEY}`,
      }),
      parent,
    });
  }

  await writeXMLAsync({ path: stylesPath, xml });

  return xml;
}

export async function setStatusBarColorsForThemeAsync({
  projectRoot,
  kind,
  statusBarBackgroundColor,
}: {
  projectRoot: string;
  kind?: ResourceKind;
  statusBarBackgroundColor?: string | null;
}): Promise<ResourceXML> {
  const colorsPath = await getProjectColorsXMLPathAsync(projectRoot, { kind });

  let colors = await readResourcesXMLAsync({ path: colorsPath });

  if (statusBarBackgroundColor == null) {
    colors = removeColorItem(COLOR_PRIMARY_DARK_KEY, colors);
  } else {
    colors = setColorItem(
      buildResourceItem({ name: COLOR_PRIMARY_DARK_KEY, value: statusBarBackgroundColor }),
      colors
    );
  }

  await writeXMLAsync({ path: colorsPath, xml: colors });

  return colors;
}
