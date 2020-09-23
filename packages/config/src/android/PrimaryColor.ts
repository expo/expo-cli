import { ExpoConfig } from '../Config.types';
import { getProjectColorsXMLPathAsync, readColorsXMLAsync, setColorItem } from './Colors';
import { readXMLAsync, writeXMLAsync } from './Manifest';
import { getProjectStylesXMLPathAsync, setStylesItem, XMLItem } from './Styles';

const COLOR_PRIMARY_KEY = 'colorPrimary';
const DEFAULT_PRIMARY_COLOR = '#023c69';

export function getPrimaryColor(config: ExpoConfig) {
  return config.primaryColor ?? DEFAULT_PRIMARY_COLOR;
}

export async function setPrimaryColor(config: ExpoConfig, projectDirectory: string) {
  const hexString = getPrimaryColor(config);

  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);

  let stylesJSON = await readXMLAsync({ path: stylesPath });
  let colorsJSON = await readColorsXMLAsync(colorsPath);

  const colorItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];
  const styleItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];

  colorItemToAdd[0]._ = hexString;
  colorItemToAdd[0].$.name = COLOR_PRIMARY_KEY;

  styleItemToAdd[0]._ = `@color/${COLOR_PRIMARY_KEY}`;
  styleItemToAdd[0].$.name = COLOR_PRIMARY_KEY;

  colorsJSON = setColorItem(colorItemToAdd, colorsJSON);
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
      `Error setting Android primary color. Cannot write new styles.xml to ${stylesPath}.`
    );
  }
  return true;
}
