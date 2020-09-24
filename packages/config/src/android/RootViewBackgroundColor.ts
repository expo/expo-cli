import { ExpoConfig } from '../Config.types';
import { getProjectColorsXMLPathAsync, setColorItem } from './Colors';
import { buildResourceItem, readResourcesXMLAsync, ResourceItemXML } from './Resources';
import { getProjectStylesXMLPathAsync, setStylesItem } from './Styles';
import { writeXMLAsync } from './XML';

const ANDROID_WINDOW_BACKGROUND = 'android:windowBackground';
const WINDOW_BACKGROUND_COLOR = 'activityBackground';

export function getRootViewBackgroundColor(config: ExpoConfig) {
  if (config.android?.backgroundColor) {
    return config.android.backgroundColor;
  }
  if (config.backgroundColor) {
    return config.backgroundColor;
  }

  return null;
}

export async function setRootViewBackgroundColor(config: ExpoConfig, projectDirectory: string) {
  const hexString = getRootViewBackgroundColor(config);
  if (!hexString) {
    return false;
  }

  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);

  let stylesJSON = await readResourcesXMLAsync({ path: stylesPath });
  let colorsJSON = await readResourcesXMLAsync({ path: colorsPath });

  const colorItemToAdd = buildResourceItem({ name: WINDOW_BACKGROUND_COLOR, value: hexString });
  const styleItemToAdd = buildResourceItem({
    name: ANDROID_WINDOW_BACKGROUND,
    value: `@color/${WINDOW_BACKGROUND_COLOR}`,
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
      `Error setting Android root view background color. Cannot write new styles.xml to ${stylesPath}.`
    );
  }
  return true;
}
