import { AndroidSplashScreenConfig } from '@expo/configure-splash-screen';

import { getProjectColorsXMLPathAsync, setColorItem } from '../Colors';
import { buildResourceItem, readResourcesXMLAsync, ResourceKind, ResourceXML } from '../Resources';
import { writeXMLAsync } from '../XML';

const SPLASH_COLOR_NAME = 'splashscreen_background';
const STATUSBAR_COLOR_NAME = 'splashscreen_statusbar_color';

export async function setSplashColorsAsync(
  splashConfig: AndroidSplashScreenConfig,
  projectRoot: string
) {
  const backgroundColor = splashConfig.backgroundColor;
  const statusBarBackgroundColor = splashConfig.statusBar?.backgroundColor;
  const darkBackgroundColor = splashConfig.darkMode?.backgroundColor;
  const darkStatusBarBackgroundColor = splashConfig.darkMode?.statusBar?.backgroundColor;

  // TODO: Why?
  if (darkStatusBarBackgroundColor && !statusBarBackgroundColor) {
    throw new Error(
      `'darkModeStatusBarBackgroundColor' is available only if 'statusBarBackgroundColor' is provided as well.`
    );
  }
  await Promise.all([
    setSplashColorsForThemeAsync({
      projectRoot,
      kind: 'values-night',
      backgroundColor: darkBackgroundColor,
      statusBarBackgroundColor: darkStatusBarBackgroundColor,
    }),
    setSplashColorsForThemeAsync({
      projectRoot,
      kind: 'values',
      backgroundColor,
      statusBarBackgroundColor,
    }),
  ]);
}

async function setSplashColorsForThemeAsync({
  backgroundColor,
  statusBarBackgroundColor,
  ...props
}: {
  projectRoot: string;
  kind?: ResourceKind;
  backgroundColor?: string;
  statusBarBackgroundColor?: string;
}): Promise<ResourceXML> {
  const colorsPath = await getProjectColorsXMLPathAsync(props.projectRoot, { kind: props.kind });

  let colors = await readResourcesXMLAsync({ path: colorsPath });

  if (backgroundColor) {
    colors = setColorItem(
      buildResourceItem({ name: SPLASH_COLOR_NAME, value: backgroundColor }),
      colors
    );
  }

  if (statusBarBackgroundColor) {
    colors = setColorItem(
      buildResourceItem({ name: STATUSBAR_COLOR_NAME, value: statusBarBackgroundColor }),
      colors
    );
  }

  await writeXMLAsync({ path: colorsPath, xml: colors });

  return colors;
}
