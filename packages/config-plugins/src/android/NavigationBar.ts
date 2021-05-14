import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withDangerousMod } from '../plugins/withDangerousMod';
import { writeXMLAsync } from '../utils/XML';
import * as WarningAggregator from '../utils/warnings';
import { getProjectColorsXMLPathAsync, setColorItem } from './Colors';
import { buildResourceItem, readResourcesXMLAsync } from './Resources';
import { getProjectStylesXMLPathAsync, setStylesItem } from './Styles';

const NAVIGATION_BAR_COLOR = 'navigationBarColor';
const WINDOW_LIGHT_NAVIGATION_BAR = 'android:windowLightNavigationBar';

export const withNavigationBar: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      await setNavigationBarConfig(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export function getNavigationBarImmersiveMode(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.visible || null;
}

export function getNavigationBarColor(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.backgroundColor || null;
}

export function getNavigationBarStyle(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.barStyle || 'light-content';
}

export async function setNavigationBarConfig(
  config: Pick<ExpoConfig, 'androidNavigationBar'>,
  projectRoot: string
) {
  const immersiveMode = getNavigationBarImmersiveMode(config);
  const hexString = getNavigationBarColor(config);
  const barStyle = getNavigationBarStyle(config);

  const stylesPath = await getProjectStylesXMLPathAsync(projectRoot);
  const colorsPath = await getProjectColorsXMLPathAsync(projectRoot);

  let stylesJSON = await readResourcesXMLAsync({ path: stylesPath });
  let colorsJSON = await readResourcesXMLAsync({ path: colorsPath });

  if (immersiveMode) {
    // Immersive mode needs to be set programatically
    WarningAggregator.addWarningAndroid(
      'androidNavigationBar.visible',
      'Hiding the navigation bar must be done programmatically. Refer to the Android documentation - https://developer.android.com/training/system-ui/immersive - for instructions.'
    );
  }
  if (hexString) {
    const colorItemToAdd = buildResourceItem({ name: NAVIGATION_BAR_COLOR, value: hexString });
    colorsJSON = setColorItem(colorItemToAdd, colorsJSON);

    const styleItemToAdd = buildResourceItem({
      name: `android:${NAVIGATION_BAR_COLOR}`,
      value: `@color/${NAVIGATION_BAR_COLOR}`,
    });
    stylesJSON = setStylesItem({
      item: styleItemToAdd,
      xml: stylesJSON,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }
  if (barStyle === 'dark-content') {
    const navigationBarStyleItem = buildResourceItem({
      name: WINDOW_LIGHT_NAVIGATION_BAR,
      value: 'true',
    });
    stylesJSON = setStylesItem({
      item: navigationBarStyleItem,
      xml: stylesJSON,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }

  try {
    await Promise.all([
      writeXMLAsync({ path: colorsPath, xml: colorsJSON }),
      writeXMLAsync({ path: stylesPath, xml: stylesJSON }),
    ]);
  } catch (e) {
    throw new Error(
      `Error setting Android navigation bar color. Cannot write colors.xml to ${colorsPath}, or styles.xml to ${stylesPath}.`
    );
  }
  return true;
}
