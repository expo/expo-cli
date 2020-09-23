import { ExpoConfig } from '../Config.types';
import { addWarningAndroid } from '../WarningAggregator';
import { getProjectColorsXMLPathAsync, readColorsXMLAsync, setColorItem } from './Colors';
import { readXMLAsync, writeXMLAsync } from './Manifest';
import { getProjectStylesXMLPathAsync, setStylesItem, XMLItem } from './Styles';

const NAVIGATION_BAR_COLOR = 'navigationBarColor';
const WINDOW_LIGHT_NAVIGATION_BAR = 'android:windowLightNavigationBar';

export function getNavigationBarImmersiveMode(config: ExpoConfig) {
  return config.androidNavigationBar?.visible || null;
}

export function getNavigationBarColor(config: ExpoConfig) {
  return config.androidNavigationBar?.backgroundColor || null;
}

export function getNavigationBarStyle(config: ExpoConfig) {
  return config.androidNavigationBar?.barStyle || 'light-content';
}

export async function setNavigationBarConfig(config: ExpoConfig, projectDirectory: string) {
  const immersiveMode = getNavigationBarImmersiveMode(config);
  const hexString = getNavigationBarColor(config);
  const barStyle = getNavigationBarStyle(config);

  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);

  let stylesJSON = await readXMLAsync({ path: stylesPath });
  let colorsJSON = await readColorsXMLAsync(colorsPath);

  if (immersiveMode) {
    // Immersive mode needs to be set programatically
    addWarningAndroid(
      'androidNavigationBar.visible',
      'Hiding the navigation bar must be done programmatically. Refer to the Android documentation - https://developer.android.com/training/system-ui/immersive - for instructions.'
    );
  }
  if (hexString) {
    const colorItemToAdd: XMLItem[] = [{ _: hexString, $: { name: NAVIGATION_BAR_COLOR } }];
    colorsJSON = setColorItem(colorItemToAdd, colorsJSON);

    const styleItemToAdd: XMLItem[] = [
      { _: `@color/${NAVIGATION_BAR_COLOR}`, $: { name: `android:${NAVIGATION_BAR_COLOR}` } },
    ];
    stylesJSON = setStylesItem({
      item: styleItemToAdd,
      xml: stylesJSON,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }
  if (barStyle === 'dark-content') {
    const navigationBarStyleItem: XMLItem[] = [
      { _: 'true', $: { name: WINDOW_LIGHT_NAVIGATION_BAR } },
    ];
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
