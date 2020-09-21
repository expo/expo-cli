import { ExpoConfig, ExportedConfig } from '../Config.types';
import { withOptionalStylesColorsPair } from '../plugins/withAndroid';
import { getProjectColorsXMLPathAsync, readColorsXMLAsync, setColorItem } from './Colors';
import { readXMLAsync, writeXMLAsync } from './Manifest';
import { getProjectStylesXMLPathAsync, setStylesItem, XMLItem } from './Styles';

const COLOR_PRIMARY_DARK_KEY = 'colorPrimaryDark';
const WINDOW_TRANSLUCENT_STATUS = 'android:windowTranslucentStatus';
const WINDOW_LIGHT_STATUS_BAR = 'android:windowLightStatusBar';

export function getStatusBarColor(config: ExpoConfig) {
  return config.androidStatusBar?.backgroundColor || 'translucent';
}

export function getStatusBarStyle(config: ExpoConfig) {
  return config.androidStatusBar?.barStyle || 'light-content';
}

export const withStatusBarConfig = (
  config: ExportedConfig,
  kind: string = 'values'
): ExportedConfig => {
  return withOptionalStylesColorsPair(config, kind, async props => {
    const hexString = getStatusBarColor(config.expo);
    const statusBarStyle = getStatusBarStyle(config.expo);

    const styleItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];
    if (hexString === 'translucent') {
      // translucent status bar set in theme
      styleItemToAdd[0]._ = 'true';
      styleItemToAdd[0].$.name = WINDOW_TRANSLUCENT_STATUS;
    } else {
      // Need to add a color key to colors.xml to use in styles.xml
      const colorItemToAdd: XMLItem[] = [{ _: hexString, $: { name: COLOR_PRIMARY_DARK_KEY } }];
      props.colors = setColorItem(colorItemToAdd, props.colors);

      styleItemToAdd[0]._ = `@color/${COLOR_PRIMARY_DARK_KEY}`;
      styleItemToAdd[0].$.name = COLOR_PRIMARY_DARK_KEY;
    }

    // Default is light-content, don't need to do anything to set it
    if (statusBarStyle === 'dark-content') {
      const statusBarStyleItem: XMLItem[] = [{ _: 'true', $: { name: WINDOW_LIGHT_STATUS_BAR } }];
      props.styles = setStylesItem({
        item: statusBarStyleItem,
        xml: props.styles,
        parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
      });
    }

    props.styles = setStylesItem({
      item: styleItemToAdd,
      xml: props.styles,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });

    return props;
  });
};

export async function setStatusBarConfig(config: ExpoConfig, projectDirectory: string) {
  const hexString = getStatusBarColor(config);
  const statusBarStyle = getStatusBarStyle(config);

  const stylesPath = await getProjectStylesXMLPathAsync(projectDirectory);
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);
  if (!colorsPath || !stylesPath) {
    return false;
  }

  let stylesJSON = await readXMLAsync({ path: stylesPath });
  let colorsJSON = await readColorsXMLAsync(colorsPath);

  const styleItemToAdd: XMLItem[] = [{ _: '', $: { name: '' } }];
  if (hexString === 'translucent') {
    // translucent status bar set in theme
    styleItemToAdd[0]._ = 'true';
    styleItemToAdd[0].$.name = WINDOW_TRANSLUCENT_STATUS;
  } else {
    // Need to add a color key to colors.xml to use in styles.xml
    const colorItemToAdd: XMLItem[] = [{ _: hexString, $: { name: COLOR_PRIMARY_DARK_KEY } }];
    colorsJSON = setColorItem(colorItemToAdd, colorsJSON);

    styleItemToAdd[0]._ = `@color/${COLOR_PRIMARY_DARK_KEY}`;
    styleItemToAdd[0].$.name = COLOR_PRIMARY_DARK_KEY;
  }

  // Default is light-content, don't need to do anything to set it
  if (statusBarStyle === 'dark-content') {
    const statusBarStyleItem: XMLItem[] = [{ _: 'true', $: { name: WINDOW_LIGHT_STATUS_BAR } }];
    stylesJSON = setStylesItem({
      item: statusBarStyleItem,
      xml: stylesJSON,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
    });
  }

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
      `Error setting Android status bar config. Cannot write colors.xml to ${colorsPath}, or styles.xml to ${stylesPath}.`
    );
  }
  return true;
}
