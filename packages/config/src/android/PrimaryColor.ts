import { ExpoConfig, ExportedConfig } from '../Config.types';
import { withOptionalStylesColorsPair } from '../plugins/withAndroid';
import { getProjectColorsXMLPathAsync, readColorsXMLAsync, setColorItem } from './Colors';
import { readXMLAsync, writeXMLAsync } from './Manifest';
import { getProjectStylesXMLPathAsync, setStylesItem, XMLItem } from './Styles';

const COLOR_PRIMARY_KEY = 'colorPrimary';
const DEFAULT_PRIMARY_COLOR = '#023c69';

export function getPrimaryColor(config: ExpoConfig) {
  return config.primaryColor ?? DEFAULT_PRIMARY_COLOR;
}

export const withPrimaryColor = (
  config: ExportedConfig,
  kind: string = 'values'
): ExportedConfig => {
  return withOptionalStylesColorsPair(config, kind, async props => {
    const hexString = getPrimaryColor(config.expo);
    const colorItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];
    const styleItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];

    colorItemToAdd[0]._ = hexString;
    colorItemToAdd[0].$.name = COLOR_PRIMARY_KEY;

    styleItemToAdd[0]._ = `@color/${COLOR_PRIMARY_KEY}`;
    styleItemToAdd[0].$.name = COLOR_PRIMARY_KEY;

    props.colors = setColorItem(colorItemToAdd, props.colors);
    props.styles = setStylesItem({
      item: styleItemToAdd,
      xml: props.styles,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });

    return props;
  });
};

export async function setPrimaryColor(config: ExpoConfig, projectDirectory: string) {
  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);
  if (!colorsPath || !stylesPath) {
    return false;
  }
  const hexString = getPrimaryColor(config);

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
