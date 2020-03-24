import {
  XMLItem,
  getProjectStylesXMLPathAsync,
  readStylesXMLAsync,
  setStylesItem,
  writeStylesXMLAsync,
} from './Styles';
import {
  getProjectColorsXMLPathAsync,
  readColorsXMLAsync,
  setColorItem,
  writeColorsXMLAsync,
} from './Colors';
import { ExpoConfig } from '../Config.types';

const COLOR_PRIMARY_DARK_KEY = 'colorPrimaryDark';
const WINDOW_TRANSLUCENT_STATUS = 'android:windowTranslucentStatus';
const WINDOW_LIGHT_STATUS_BAR = 'android:windowLightStatusBar';

export function getStatusBarColor(config: ExpoConfig) {
  return config.androidStatusBar?.backgroundColor || 'translucent';
}

export function getStatusBarStyle(config: ExpoConfig) {
  return config.androidStatusBar?.barStyle || 'light-content';
}

export async function setStatusBarColor(config: ExpoConfig, projectDirectory: string) {
  let hexString = getStatusBarColor(config);
  let statusBarStyle = getStatusBarStyle(config);

  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);
  if (!colorsPath || !stylesPath) {
    return false;
  }

  let stylesJSON = await readStylesXMLAsync(stylesPath);
  let colorsJSON = await readColorsXMLAsync(colorsPath);

  let styleItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];
  if (hexString === 'translucent') {
    // translucent status bar set in theme
    styleItemToAdd[0]._ = 'true';
    styleItemToAdd[0].$.name = WINDOW_TRANSLUCENT_STATUS;
  } else {
    // Need to add a color key to colors.xml to use in styles.xml
    let colorItemToAdd: XMLItem[] = [{ _: hexString, $: { name: COLOR_PRIMARY_DARK_KEY } }];
    colorsJSON = setColorItem(colorItemToAdd, colorsJSON);

    styleItemToAdd[0]._ = `@color/${COLOR_PRIMARY_DARK_KEY}`;
    styleItemToAdd[0].$.name = COLOR_PRIMARY_DARK_KEY;
  }

  // Default is light-content, don't need to do anything to set it
  if (statusBarStyle === 'dark-content') {
    let statusBarStyleItem: XMLItem[] = [{ _: 'true', $: { name: WINDOW_LIGHT_STATUS_BAR } }];
    stylesJSON = setStylesItem(statusBarStyleItem, stylesJSON);
  }

  stylesJSON = setStylesItem(styleItemToAdd, stylesJSON);

  try {
    await writeColorsXMLAsync(colorsPath, colorsJSON);
    await writeStylesXMLAsync(stylesPath, stylesJSON);
  } catch (e) {
    throw new Error(
      `Error setting Android status bar config. Cannot write colors.xml to ${colorsPath}, or styles.xml to ${stylesPath}.`
    );
  }
  return true;
}
