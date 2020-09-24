import { ExpoConfig } from '../Config.types';
import { getProjectColorsXMLPathAsync, setColorItem } from './Colors';
import { buildResourceItem, readResourcesXMLAsync, ResourceItemXML } from './Resources';
import { getProjectStylesXMLPathAsync, setStylesItem } from './Styles';
import { writeXMLAsync } from './XML';

const COLOR_PRIMARY_DARK_KEY = 'colorPrimaryDark';
const WINDOW_TRANSLUCENT_STATUS = 'android:windowTranslucentStatus';
const WINDOW_LIGHT_STATUS_BAR = 'android:windowLightStatusBar';

export function getStatusBarColor(config: ExpoConfig) {
  return config.androidStatusBar?.backgroundColor || 'translucent';
}

export function getStatusBarStyle(config: ExpoConfig) {
  return config.androidStatusBar?.barStyle || 'light-content';
}

export async function setStatusBarConfig(config: ExpoConfig, projectDirectory: string) {
  const hexString = getStatusBarColor(config);
  const statusBarStyle = getStatusBarStyle(config);

  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);

  let stylesJSON = await readResourcesXMLAsync({ path: stylesPath });
  let colorsJSON = await readResourcesXMLAsync({ path: colorsPath });

  let styleItemToAdd: ResourceItemXML;
  if (hexString === 'translucent') {
    // translucent status bar set in theme
    styleItemToAdd = buildResourceItem({ name: WINDOW_TRANSLUCENT_STATUS, value: 'true' });
  } else {
    // Need to add a color key to colors.xml to use in styles.xml
    const colorItemToAdd = buildResourceItem({ name: COLOR_PRIMARY_DARK_KEY, value: hexString });
    colorsJSON = setColorItem(colorItemToAdd, colorsJSON);

    styleItemToAdd = buildResourceItem({
      name: COLOR_PRIMARY_DARK_KEY,
      value: `@color/${COLOR_PRIMARY_DARK_KEY}`,
    });
  }

  // Default is light-content, don't need to do anything to set it
  if (statusBarStyle === 'dark-content') {
    const statusBarStyleItem: ResourceItemXML = buildResourceItem({
      name: WINDOW_LIGHT_STATUS_BAR,
      value: `true`,
    });
    stylesJSON = setStylesItem({
      item: statusBarStyleItem,
      xml: stylesJSON,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }

  stylesJSON = setStylesItem({
    item: styleItemToAdd,
    xml: stylesJSON,
    parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
  });

  try {
    await Promise.all([
      writeXMLAsync({ path: colorsPath, xml: colorsJSON }),
      writeXMLAsync({ path: stylesPath, xml: stylesJSON }),
    ]);
  } catch (e) {
    throw new Error(
      `Error setting Android status bar config. Cannot write colors.xml to ${colorsPath}, or styles.xml to ${stylesPath}.`
    );
  }
  return true;
}
