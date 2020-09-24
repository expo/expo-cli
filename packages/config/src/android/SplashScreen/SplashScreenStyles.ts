import {
  AndroidSplashScreenConfig,
  SplashScreenStatusBarStyle,
} from '@expo/configure-splash-screen';
import deepEqual from 'deep-equal';
import { Builder } from 'xml2js';

import { SplashScreenStatusBarStyleType } from '../../Config.types';
import {
  Document,
  readXMLAsync,
  writeXMLAsync,
  writeXMLOrRemoveFileUponNoResourcesAsync,
} from '../Manifest';
import {
  buildItem,
  ensureStylesObject,
  getProjectStylesXMLPathAsync,
  getStyleParent,
  removeStyleParent,
  removeStylesItem,
  setStylesItem,
} from '../Styles';

const STYLE_NAME = 'Theme.App.SplashScreen';

function configureStyle(
  xml: Document,
  {
    statusBarHidden,
    statusBarStyle,
    addStatusBarBackgroundColor,
  }: {
    statusBarHidden?: boolean;
    statusBarStyle?: SplashScreenStatusBarStyleType;
    addStatusBarBackgroundColor?: boolean;
  }
): Document {
  const parent = { name: STYLE_NAME, parent: 'Theme.AppCompat.Light.NoActionBar' };

  setStylesItem({
    xml,
    item: [buildItem({ name: 'android:windowBackground', value: '@drawable/splashscreen' })],
    parent,
  });

  if (statusBarHidden == null) {
    removeStylesItem({ xml, name: 'android:windowFullscreen', parent });
  } else {
    setStylesItem({
      xml,
      item: [buildItem({ name: 'android:windowFullscreen', value: String(statusBarHidden) })],
      parent,
    });
  }
  if (statusBarStyle === undefined || statusBarStyle === SplashScreenStatusBarStyle.DEFAULT) {
    removeStylesItem({ xml, name: 'android:windowLightStatusBar', parent });
  } else {
    setStylesItem({
      xml,
      item: [
        buildItem({
          name: 'android:windowLightStatusBar',
          value:
            statusBarStyle === SplashScreenStatusBarStyle.LIGHT_CONTENT
              ? 'false'
              : statusBarStyle === SplashScreenStatusBarStyle.DARK_CONTENT
              ? 'true'
              : '',
        }),
      ],
      parent,
    });
  }

  if (!addStatusBarBackgroundColor) {
    removeStylesItem({ xml, name: 'android:statusBarColor', parent });
  } else {
    setStylesItem({
      xml,
      item: [
        buildItem({ name: 'android:statusBarColor', value: '@color/splashscreen_statusbar_color' }),
      ],
      parent,
    });
  }
  return xml;
}

/**
 * Compares two subparts (`style` elements with STYLE_NAME name attribute) of given elements disregarding comments
 */
function areStyleElementsEqual(a: Document, b: Document): boolean {
  const styleA = getStyleParent(a, { name: STYLE_NAME });
  const styleB = getStyleParent(b, { name: STYLE_NAME });

  return !!styleA && !!styleB && deepEqual(styleA, styleB);
}

export async function setStylesAsync(
  splashConfig: Pick<AndroidSplashScreenConfig, 'statusBar' | 'darkMode'>,
  projectDirectory: string
) {
  const statusBarStyle = (splashConfig.statusBar?.style ??
    SplashScreenStatusBarStyle.DEFAULT) as SplashScreenStatusBarStyleType;
  const statusBarHidden = splashConfig.statusBar?.hidden;
  const darkModeStatusBarStyle = splashConfig.darkMode?.statusBar?.style as
    | SplashScreenStatusBarStyleType
    | undefined;
  const addStatusBarBackgroundColor = Boolean(splashConfig.statusBar?.backgroundColor);

  if (darkModeStatusBarStyle && !statusBarStyle) {
    throw new Error(
      `'darkModeStatusBarStyle' is available only if 'statusBarStyle' is provided as well.`
    );
  }

  const filePath = (await getProjectStylesXMLPathAsync(projectDirectory, { kind: 'values' }))!;
  const v23FilePath = (await getProjectStylesXMLPathAsync(projectDirectory, {
    kind: 'values-night-v23',
  }))!;
  const v23DarkFilePath = (await getProjectStylesXMLPathAsync(projectDirectory, {
    kind: 'values-v23',
  }))!;

  const fallback = '<?xml version="1.0" encoding="utf-8"?>';
  const xmlContent = await readXMLAsync({ path: filePath, fallback });

  // Create a fallback item based on the existing styles that will be used for the other themes.
  const fallbackItem = { resources: {} };
  ensureStylesObject({
    xml: fallbackItem,
    parent: { name: STYLE_NAME, parent: 'Theme.AppCompat.Light.NoActionBar' },
  });

  const contentWithSingleStyleString = fallbackItem
    ? new Builder().buildObject(fallbackItem)
    : undefined;

  const v23XmlContent = await readXMLAsync({
    path: v23FilePath,
    fallback: contentWithSingleStyleString,
  });

  const v23DarkXmlContent = await readXMLAsync({
    path: v23DarkFilePath,
    fallback: contentWithSingleStyleString,
  });

  const configuredXmlContent = configureStyle(xmlContent, {
    statusBarHidden,
    addStatusBarBackgroundColor,
  });

  const configuredV23XmlContent = configureStyle(v23XmlContent, {
    statusBarHidden,
    statusBarStyle,
    addStatusBarBackgroundColor,
  });
  const configuredV23DarkXmlContent = configureStyle(v23DarkXmlContent, {
    statusBarHidden,
    statusBarStyle: darkModeStatusBarStyle ?? statusBarStyle,
    addStatusBarBackgroundColor,
  });

  if (areStyleElementsEqual(configuredV23DarkXmlContent, configuredV23XmlContent)) {
    await writeXMLOrRemoveFileUponNoResourcesAsync(
      v23DarkFilePath,
      removeStyleParent({
        xml: configuredV23DarkXmlContent,
        parent: { name: STYLE_NAME },
      })
    );
  } else {
    await writeXMLAsync({ path: v23DarkFilePath, xml: configuredV23DarkXmlContent });
  }

  if (areStyleElementsEqual(configuredV23XmlContent, configuredXmlContent)) {
    await writeXMLOrRemoveFileUponNoResourcesAsync(
      v23FilePath,
      removeStyleParent({
        xml: configuredV23XmlContent,
        parent: { name: STYLE_NAME },
      })
    );
  } else {
    await writeXMLAsync({ path: v23FilePath, xml: configuredV23XmlContent });
  }

  await writeXMLAsync({ path: filePath, xml: configuredXmlContent });
}
