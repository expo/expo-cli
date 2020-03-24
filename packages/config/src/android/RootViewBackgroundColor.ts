import { ExpoConfig } from '../Config.types';
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

const ANDROID_WINDOW_BACKGROUND = 'android:windowBackground';
const WINDOW_BACKGROUND_COLOR = 'activityBackground';

export function getRootViewBackgroundColor(config: ExpoConfig) {
  if (config.android && config.android.backgroundColor) {
    return config.android.backgroundColor;
  }
  if (config.backgroundColor) {
    return config.backgroundColor;
  }

  return null;
}

export async function setRootViewBackgroundColor(config: ExpoConfig, projectDirectory: string) {
  let hexString = getRootViewBackgroundColor(config);
  if (!hexString) {
    return false;
  }

  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);
  if (!colorsPath || !stylesPath) {
    return false;
  }

  let stylesJSON = await readStylesXMLAsync(stylesPath);
  let colorsJSON = await readColorsXMLAsync(colorsPath);

  let colorItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];
  let styleItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];

  colorItemToAdd[0]._ = hexString;
  colorItemToAdd[0].$.name = WINDOW_BACKGROUND_COLOR;

  styleItemToAdd[0]._ = `@color/${WINDOW_BACKGROUND_COLOR}`;
  styleItemToAdd[0].$.name = ANDROID_WINDOW_BACKGROUND;

  colorsJSON = setColorItem(colorItemToAdd, colorsJSON);
  stylesJSON = setStylesItem(styleItemToAdd, stylesJSON);

  try {
    await writeColorsXMLAsync(colorsPath, colorsJSON);
    await writeStylesXMLAsync(stylesPath, stylesJSON);
  } catch (e) {
    throw new Error(
      `Error setting Android root view background color. Cannot write new AndroidManifest.xml to ${stylesPath}.`
    );
  }
  return true;
}
