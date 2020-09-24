import { ExpoConfig } from '../Config.types';
import { getProjectColorsXMLPathAsync, removeColorItem, setColorItem } from './Colors';
import { buildResourceItem, readResourcesXMLAsync, ResourceKind, ResourceXML } from './Resources';
import { getProjectStylesXMLPathAsync, removeStyleItem, setStylesItem } from './Styles';
import { writeXMLAsync } from './XML';

// TODO: Maybe splashscreen_statusbar_color or just statusbar_color is a better name.
const COLOR_PRIMARY_DARK_KEY = 'colorPrimaryDark';
const WINDOW_TRANSLUCENT_STATUS = 'android:windowTranslucentStatus';
const WINDOW_LIGHT_STATUS_BAR = 'android:windowLightStatusBar';

export function getStatusBarColor(config: ExpoConfig) {
  return config.androidStatusBar?.backgroundColor || 'translucent';
}

export function getStatusBarStyle(config: ExpoConfig) {
  return config.androidStatusBar?.barStyle || 'light-content';
}

export function getStatusBarHidden(config: ExpoConfig): boolean | null {
  return config.androidStatusBar?.hidden ?? null;
}

export function getStatusBarTranslucent(config: ExpoConfig): boolean | null {
  return config.androidStatusBar?.translucent ?? null;
}

const styleResourceGroup = {
  // Must use splash screen theme instead of AppTheme
  name: 'Theme.App.SplashScreen',
  parent: 'Theme.AppCompat.Light.NoActionBar',
};

export async function setStatusBarConfig(config: ExpoConfig, projectDirectory: string) {
  // TODO: dark theme -- need to add it to the config first.
  const hexString = getStatusBarColor(config);
  const statusBarStyle = getStatusBarStyle(config);
  const statusBarHidden = getStatusBarHidden(config);
  const statusBarTranslucent = getStatusBarTranslucent(config);

  // TODO: use kind: values-night, values-night-v23, and values-v23
  await Promise.all([
    setStatusBarStylesForThemeAsync({
      projectRoot: projectDirectory,
      kind: 'values',
      hidden: statusBarHidden,
      barStyle: statusBarStyle,
      translucent: statusBarTranslucent,
      // TODO: Make this not default to translucent
      addStatusBarBackgroundColor: !!hexString && hexString !== 'translucent',
    }),
    setStatusBarColorsForThemeAsync({
      projectRoot: projectDirectory,
      kind: 'values',
      statusBarBackgroundColor: hexString === 'translucent' ? null : hexString,
    }),
  ]);

  return true;
}

async function setStatusBarStylesForThemeAsync({
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
    xml = removeStyleItem({ xml, name: WINDOW_TRANSLUCENT_STATUS, parent });
  } else {
    xml = setStylesItem({
      xml,
      item: buildResourceItem({ name: WINDOW_TRANSLUCENT_STATUS, value: String(translucent) }),
      parent,
    });
  }

  if (hidden == null) {
    xml = removeStyleItem({
      xml,
      name: 'android:windowFullscreen',
      parent: styleResourceGroup,
    });
  } else {
    const hiddenItem = buildResourceItem({
      name: 'android:windowFullscreen',
      value: String(hidden),
    });
    xml = setStylesItem({
      xml,
      item: hiddenItem,
      parent: styleResourceGroup,
    });
  }

  if (barStyle === undefined) {
    xml = removeStyleItem({ xml, name: WINDOW_LIGHT_STATUS_BAR, parent });
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
    xml = removeStyleItem({ xml, name: 'android:statusBarColor', parent });
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

async function setStatusBarColorsForThemeAsync({
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
