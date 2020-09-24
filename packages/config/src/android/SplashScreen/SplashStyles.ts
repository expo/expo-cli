import { ExpoConfig } from '../../Config.types';
import { getProjectColorsXMLPathAsync, removeColorItem, setColorItem } from '../Colors';
import { buildResourceItem, readResourcesXMLAsync, ResourceKind, ResourceXML } from '../Resources';
import { getProjectStylesXMLPathAsync, setStylesItem } from '../Styles';
import { writeXMLAsync } from '../XML';
import { getDarkSplashConfig, getSplashConfig } from './SplashConfig';

const styleResourceGroup = {
  name: 'Theme.App.SplashScreen',
  parent: 'Theme.AppCompat.Light.NoActionBar',
};
const SPLASH_COLOR_NAME = 'splashscreen_background';

export function getSplashBackgroundColor(config: ExpoConfig): string | null {
  return getSplashConfig(config)?.backgroundColor ?? null;
}

export function getSplashDarkBackgroundColor(config: ExpoConfig): string | null {
  return getDarkSplashConfig(config)?.backgroundColor ?? null;
}

export async function setSplashStylesAsync(config: ExpoConfig, projectDirectory: string) {
  const backgroundColor = getSplashBackgroundColor(config);
  const darkBackgroundColor = getSplashDarkBackgroundColor(config);

  // TODO: Does this need to be themed?
  setSplashStylesForThemeAsync({
    projectRoot: projectDirectory,
    // kind: theme.kind,
  });
  for (const theme of [
    { kind: 'values', color: backgroundColor },
    { kind: 'values-night', color: darkBackgroundColor },
  ]) {
    // TODO: use kind: values-night, values-night-v23, and values-v23
    setSplashColorsForThemeAsync({
      projectRoot: projectDirectory,
      kind: theme.kind as ResourceKind,
      backgroundColor: theme.color,
    });
  }

  return true;
}

export async function setSplashStylesForThemeAsync({
  projectRoot,
  kind,
}: {
  projectRoot: string;
  kind?: ResourceKind;
}): Promise<ResourceXML> {
  const stylesPath = await getProjectStylesXMLPathAsync(projectRoot, { kind });

  let xml = await readResourcesXMLAsync({ path: stylesPath });

  const parent = styleResourceGroup;

  // Add splash screen image
  xml = setStylesItem({
    xml,
    item: buildResourceItem({ name: 'android:windowBackground', value: '@drawable/splashscreen' }),
    parent,
  });

  await writeXMLAsync({ path: stylesPath, xml });

  return xml;
}

export async function setSplashColorsForThemeAsync({
  projectRoot,
  kind,
  backgroundColor,
}: {
  projectRoot: string;
  kind?: ResourceKind;
  backgroundColor?: string | null;
}): Promise<ResourceXML> {
  const colorsPath = await getProjectColorsXMLPathAsync(projectRoot, { kind });

  let colors = await readResourcesXMLAsync({ path: colorsPath });

  if (backgroundColor) {
    colors = setColorItem(
      buildResourceItem({ name: SPLASH_COLOR_NAME, value: backgroundColor }),
      colors
    );
  } else {
    colors = removeColorItem(SPLASH_COLOR_NAME, colors);
  }

  await writeXMLAsync({ path: colorsPath, xml: colors });

  return colors;
}
