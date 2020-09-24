import { AndroidSplashScreenConfig } from '@expo/configure-splash-screen';

import { getProjectColorsXMLPathAsync, setColorItem } from '../Colors';
import { buildResourceItem, readResourcesXMLAsync, ResourceXML } from '../Resources';
import { writeXMLAsync } from '../XML';

function applyColorsToXML(
  xml: ResourceXML,
  {
    backgroundColor,
    statusBarBackgroundColor,
  }: {
    backgroundColor?: string;
    statusBarBackgroundColor?: string;
  }
): ResourceXML {
  if (backgroundColor) {
    xml = setColorItem(
      buildResourceItem({ name: 'splashscreen_background', value: backgroundColor }),
      xml
    );
  }
  if (statusBarBackgroundColor) {
    xml = setColorItem(
      buildResourceItem({ name: 'splashscreen_statusbar_color', value: statusBarBackgroundColor }),
      xml
    );
  }

  return xml;
}

export async function setColorsAsync(
  splashConfig: AndroidSplashScreenConfig,
  projectDirectory: string
) {
  const backgroundColor = splashConfig.backgroundColor;
  const darkModeBackgroundColor = splashConfig.darkMode?.backgroundColor;
  const statusBarBackgroundColor = splashConfig.statusBar?.backgroundColor;
  const darkModeStatusBarBackgroundColor = splashConfig.darkMode?.statusBar?.backgroundColor;

  if (darkModeStatusBarBackgroundColor && !statusBarBackgroundColor) {
    throw new Error(
      `'darkModeStatusBarBackgroundColor' is available only if 'statusBarBackgroundColor' is provided as well.`
    );
  }

  const darkColorsPath = await getProjectColorsXMLPathAsync(projectDirectory, {
    kind: 'values-night',
  });

  if (darkColorsPath) {
    let darkColorsJSON = await readResourcesXMLAsync({ path: darkColorsPath });
    darkColorsJSON = applyColorsToXML(darkColorsJSON, {
      statusBarBackgroundColor: darkModeStatusBarBackgroundColor,
      backgroundColor: darkModeBackgroundColor,
    });
    await writeXMLAsync({ path: darkColorsPath, xml: darkColorsJSON });
  }
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);
  if (colorsPath) {
    let colorsJSON = await readResourcesXMLAsync({ path: colorsPath });
    colorsJSON = applyColorsToXML(colorsJSON, {
      statusBarBackgroundColor,
      backgroundColor,
    });
    await writeXMLAsync({ path: colorsPath, xml: colorsJSON });
  }
  return true;
}
