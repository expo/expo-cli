import {
  AndroidSplashScreenConfig,
  SplashScreenStatusBarStyle,
} from '@expo/configure-splash-screen';
import deepEqual from 'deep-equal';
import { Builder } from 'xml2js';

import { SplashScreenStatusBarStyleType } from '../../Config.types';
import { buildResourceItem, readResourcesXMLAsync, ResourceXML } from '../Resources';
import {
  ensureStyleGroup,
  getProjectStylesXMLPathAsync,
  getStyleParent,
  removeStyleGroup,
  removeStyleItem,
  setStylesItem,
} from '../Styles';
import { writeXMLAsync, writeXMLOrRemoveFileUponNoResourcesAsync } from '../XML';

const STYLE_NAME = 'Theme.App.SplashScreen';

export async function setSplashStylesAsync(
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

  // TODO: Prolly not needed - condense out if not
  // Create a fallback item based on the existing styles that will be used for the other themes.
  const fallbackItem = { resources: {} };

  ensureStyleGroup({
    xml: fallbackItem,
    parent: { name: STYLE_NAME, parent: 'Theme.AppCompat.Light.NoActionBar' },
  });

  const contentWithSingleStyleString = fallbackItem
    ? new Builder().buildObject(fallbackItem)
    : undefined;

  const filePath = await getProjectStylesXMLPathAsync(projectDirectory);

  let xmlContent = await readResourcesXMLAsync({ path: filePath });

  xmlContent = configureStyle(xmlContent, {
    statusBarHidden,
    addStatusBarBackgroundColor,
  });

  const v23FilePath = await getProjectStylesXMLPathAsync(projectDirectory, {
    kind: 'values-night-v23',
  });

  let v23XmlContent = await readResourcesXMLAsync({
    path: v23FilePath,
    fallback: contentWithSingleStyleString,
  });

  v23XmlContent = configureStyle(v23XmlContent, {
    statusBarHidden,
    statusBarStyle,
    addStatusBarBackgroundColor,
  });

  const v23DarkFilePath = await getProjectStylesXMLPathAsync(projectDirectory, {
    kind: 'values-v23',
  });

  let v23DarkXmlContent = await readResourcesXMLAsync({
    path: v23DarkFilePath,
    fallback: contentWithSingleStyleString,
  });

  v23DarkXmlContent = configureStyle(v23DarkXmlContent, {
    statusBarHidden,
    statusBarStyle: darkModeStatusBarStyle ?? statusBarStyle,
    addStatusBarBackgroundColor,
  });

  // TODO: Why so complex?
  if (areStyleElementsEqual(v23DarkXmlContent, v23XmlContent)) {
    await writeXMLOrRemoveFileUponNoResourcesAsync(
      v23DarkFilePath,
      removeStyleGroup({
        xml: v23DarkXmlContent,
        parent: { name: STYLE_NAME },
      })
    );
  } else {
    await writeXMLAsync({ path: v23DarkFilePath, xml: v23DarkXmlContent });
  }

  if (areStyleElementsEqual(v23XmlContent, xmlContent)) {
    await writeXMLOrRemoveFileUponNoResourcesAsync(
      v23FilePath,
      removeStyleGroup({
        xml: v23XmlContent,
        parent: { name: STYLE_NAME },
      })
    );
  } else {
    await writeXMLAsync({ path: v23FilePath, xml: v23XmlContent });
  }

  await writeXMLAsync({ path: filePath, xml: xmlContent });
}

function configureStyle(
  xml: ResourceXML,
  {
    statusBarHidden,
    statusBarStyle,
    addStatusBarBackgroundColor,
  }: {
    statusBarHidden?: boolean;
    statusBarStyle?: SplashScreenStatusBarStyleType;
    addStatusBarBackgroundColor?: boolean;
  }
): ResourceXML {
  const parent = { name: STYLE_NAME, parent: 'Theme.AppCompat.Light.NoActionBar' };

  setStylesItem({
    xml,
    item: buildResourceItem({ name: 'android:windowBackground', value: '@drawable/splashscreen' }),
    parent,
  });

  if (statusBarHidden == null) {
    removeStyleItem({ xml, name: 'android:windowFullscreen', parent });
  } else {
    setStylesItem({
      xml,
      item: buildResourceItem({ name: 'android:windowFullscreen', value: String(statusBarHidden) }),
      parent,
    });
  }

  if (statusBarStyle === undefined || statusBarStyle === SplashScreenStatusBarStyle.DEFAULT) {
    removeStyleItem({ xml, name: 'android:windowLightStatusBar', parent });
  } else {
    const windowLightStatusBarValue =
      statusBarStyle === SplashScreenStatusBarStyle.LIGHT_CONTENT
        ? 'false'
        : statusBarStyle === SplashScreenStatusBarStyle.DARK_CONTENT
        ? 'true'
        : '';
    setStylesItem({
      xml,
      item: buildResourceItem({
        name: 'android:windowLightStatusBar',
        value: windowLightStatusBarValue,
      }),
      parent,
    });
  }

  if (!addStatusBarBackgroundColor) {
    removeStyleItem({ xml, name: 'android:statusBarColor', parent });
  } else {
    setStylesItem({
      xml,
      item: buildResourceItem({
        name: 'android:statusBarColor',
        value: '@color/splashscreen_statusbar_color',
      }),
      parent,
    });
  }
  return xml;
}

/**
 * Compares two subparts (`style` elements with STYLE_NAME name attribute) of given elements disregarding comments
 */
function areStyleElementsEqual(a: ResourceXML, b: ResourceXML): boolean {
  const styleA = getStyleParent(a, { name: STYLE_NAME });
  const styleB = getStyleParent(b, { name: STYLE_NAME });

  return !!styleA && !!styleB && deepEqual(styleA, styleB);
}
