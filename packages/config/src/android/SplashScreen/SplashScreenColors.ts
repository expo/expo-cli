import { AndroidSplashScreenConfig } from '@expo/configure-splash-screen';

import { getProjectColorsXMLPathAsync, readColorsXMLAsync, setColorItem } from '../Colors';
import { Document, writeXMLAsync } from '../Manifest';

function applyColorToXML(
  document: Document,
  {
    name,
    color,
  }: {
    name: string;
    color: string;
  }
): Document {
  return setColorItem([{ _: color, $: { name } }], document);
}

function applyColorsToXML(
  document: Document,
  {
    backgroundColor,
    statusBarBackgroundColor,
  }: {
    backgroundColor?: string;
    statusBarBackgroundColor?: string;
  }
): Document {
  if (backgroundColor)
    document = applyColorToXML(document, {
      color: backgroundColor,
      name: 'splashscreen_background',
    });
  if (statusBarBackgroundColor)
    document = applyColorToXML(document, {
      color: statusBarBackgroundColor,
      name: 'splashscreen_statusbar_color',
    });

  return document;
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
    let darkColorsJSON = await readColorsXMLAsync(darkColorsPath);
    darkColorsJSON = applyColorsToXML(darkColorsJSON, {
      statusBarBackgroundColor: darkModeStatusBarBackgroundColor,
      backgroundColor: darkModeBackgroundColor,
    });
    await writeXMLAsync({ path: darkColorsPath, xml: darkColorsJSON });
  }
  const colorsPath = await getProjectColorsXMLPathAsync(projectDirectory);
  if (colorsPath) {
    let colorsJSON = await readColorsXMLAsync(colorsPath);
    colorsJSON = applyColorsToXML(colorsJSON, {
      statusBarBackgroundColor,
      backgroundColor,
    });
    await writeXMLAsync({ path: colorsPath, xml: colorsJSON });
  }
  return true;
}
