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

const COLOR_PRIMARY_KEY = 'colorPrimary';
const DEFAULT_PRIMARY_COLOR = '#023c69';

export function getPrimaryColor(config: ExpoConfig) {
  return config.primaryColor ?? DEFAULT_PRIMARY_COLOR;
}

export async function setPrimaryColor(config: ExpoConfig, projectDirectory: string) {
  let hexString = getPrimaryColor(config);

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
  colorItemToAdd[0].$.name = COLOR_PRIMARY_KEY;

  styleItemToAdd[0]._ = `@color/${COLOR_PRIMARY_KEY}`;
  styleItemToAdd[0].$.name = COLOR_PRIMARY_KEY;

  colorsJSON = setColorItem(colorItemToAdd, colorsJSON);
  stylesJSON = setStylesItem(styleItemToAdd, stylesJSON);

  try {
    await writeColorsXMLAsync(colorsPath, colorsJSON);
    await writeStylesXMLAsync(stylesPath, stylesJSON);
  } catch (e) {
    throw new Error(
      `Error setting Android primary color. Cannot write new AndroidManifest.xml to ${stylesPath}.`
    );
  }
  return true;
}
