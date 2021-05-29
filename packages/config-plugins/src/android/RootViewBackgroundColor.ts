import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withDangerousMod } from '../plugins/withDangerousMod';
import { writeXMLAsync } from '../utils/XML';
import { getProjectColorsXMLPathAsync, setColorItem } from './Colors';
import { buildResourceItem, readResourcesXMLAsync } from './Resources';
import { getProjectStylesXMLPathAsync, setStylesItem } from './Styles';

const ANDROID_WINDOW_BACKGROUND = 'android:windowBackground';
const WINDOW_BACKGROUND_COLOR = 'activityBackground';

export const withRootViewBackgroundColor: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      await setRootViewBackgroundColor(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export function getRootViewBackgroundColor(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>
) {
  if (config.android?.backgroundColor) {
    return config.android.backgroundColor;
  }
  if (config.backgroundColor) {
    return config.backgroundColor;
  }

  return null;
}

export async function setRootViewBackgroundColor(
  config: Pick<ExpoConfig, 'android' | 'backgroundColor'>,
  projectRoot: string
) {
  const hexString = getRootViewBackgroundColor(config);
  if (!hexString) {
    return false;
  }

  const stylesPath = await getProjectStylesXMLPathAsync(projectRoot);
  const colorsPath = await getProjectColorsXMLPathAsync(projectRoot);

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
