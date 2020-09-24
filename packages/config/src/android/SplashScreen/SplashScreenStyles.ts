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
    setStylesItem({
      xml,
      item: buildResourceItem({
        name: 'android:windowLightStatusBar',
        value:
          statusBarStyle === SplashScreenStatusBarStyle.LIGHT_CONTENT
            ? 'false'
            : statusBarStyle === SplashScreenStatusBarStyle.DARK_CONTENT
            ? 'true'
            : '',
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

  const xmlContent = await readResourcesXMLAsync({ path: filePath });

  // Create a fallback item based on the existing styles that will be used for the other themes.
  const fallbackItem = { resources: {} };
  ensureStyleGroup({
    xml: fallbackItem,
    parent: { name: STYLE_NAME, parent: 'Theme.AppCompat.Light.NoActionBar' },
  });

  const contentWithSingleStyleString = fallbackItem
    ? new Builder().buildObject(fallbackItem)
    : undefined;

  const v23XmlContent = await readResourcesXMLAsync({
    path: v23FilePath,
    fallback: contentWithSingleStyleString,
  });

  const v23DarkXmlContent = await readResourcesXMLAsync({
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
      removeStyleGroup({
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
      removeStyleGroup({
        xml: configuredV23XmlContent,
        parent: { name: STYLE_NAME },
      })
    );
  } else {
    await writeXMLAsync({ path: v23FilePath, xml: configuredV23XmlContent });
  }

  await writeXMLAsync({ path: filePath, xml: configuredXmlContent });
}
