import { ExpoConfig } from '../Config.types';
import { ConfigPlugin } from '../Plugin.types';
import { withDangerousAndroidMod } from '../plugins/android-plugins';
import { getProjectColorsXMLPathAsync, setColorItem } from './Colors';
import { buildResourceItem, readResourcesXMLAsync } from './Resources';
import { getProjectStylesXMLPathAsync, setStylesItem } from './Styles';
import { writeXMLAsync } from './XML';

const COLOR_PRIMARY_KEY = 'colorPrimary';
const DEFAULT_PRIMARY_COLOR = '#023c69';

export const withPrimaryColor: ConfigPlugin<void> = config => {
  return withDangerousAndroidMod(config, async config => {
    await setPrimaryColor(config, config.modRequest.projectRoot);
    return config;
  });
};

export function getPrimaryColor(config: ExpoConfig) {
  return config.primaryColor ?? DEFAULT_PRIMARY_COLOR;
}

export async function setPrimaryColor(config: ExpoConfig, projectDirectory: string) {
  const hexString = getPrimaryColor(config);

  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);

  let stylesJSON = await readResourcesXMLAsync({ path: stylesPath });
  let colorsJSON = await readResourcesXMLAsync({ path: colorsPath });

  const colorItemToAdd = buildResourceItem({ name: COLOR_PRIMARY_KEY, value: hexString });
  const styleItemToAdd = buildResourceItem({
    name: COLOR_PRIMARY_KEY,
    value: `@color/${COLOR_PRIMARY_KEY}`,
  });

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
