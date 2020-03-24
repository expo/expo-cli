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
  if (!colorsPath || !stylesPath) {
    return false;
  }

  let stylesJSON = await readStylesXMLAsync(stylesPath);
  let colorsJSON = await readColorsXMLAsync(colorsPath);

  if (immersiveMode) {
    // Immersive mode needs to be set programatically
    console.log(
      'Hiding the Android navigation bar must be done programatically. Please see the Android documentation: https://developer.android.com/training/system-ui/immersive'
    );
  }
  if (hexString) {
    let colorItemToAdd: XMLItem[] = [{ _: hexString, $: { name: NAVIGATION_BAR_COLOR } }];
    colorsJSON = setColorItem(colorItemToAdd, colorsJSON);

    let styleItemToAdd: XMLItem[] = [
      { _: `@color/${NAVIGATION_BAR_COLOR}`, $: { name: `android:${NAVIGATION_BAR_COLOR}` } },
    ];
    stylesJSON = setStylesItem(styleItemToAdd, stylesJSON);
  }
  if (barStyle === 'dark-content') {
    let navigationBarStyleItem: XMLItem[] = [
      { _: 'true', $: { name: WINDOW_LIGHT_NAVIGATION_BAR } },
    ];
    stylesJSON = setStylesItem(navigationBarStyleItem, stylesJSON);
  }

  try {
    await writeColorsXMLAsync(colorsPath, colorsJSON);
    await writeStylesXMLAsync(stylesPath, stylesJSON);
  } catch (e) {
    throw new Error(
      `Error setting Android navigation bar color. Cannot write colors.xml to ${colorsPath}, or styles.xml to ${stylesPath}.`
    );
  }
  return true;
}
