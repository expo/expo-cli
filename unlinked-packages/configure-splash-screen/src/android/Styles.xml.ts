import path from 'path';
import { Element } from 'xml-js';

import { Color } from '../SplashScreenConfig';
import { SplashScreenStatusBarStyle, SplashScreenStatusBarStyleType } from '../constants';
import {
  readXmlFile,
  writeXmlFile,
  mergeXmlElements,
  xmlElementsEqual,
  writeXmlFileOrRemoveFileUponNoResources,
} from '../xml-manipulation';

const STYLES_XML_FILE_PATH = './res/values/styles.xml';
const STYLES_V23_XML_FILE_PATH = './res/values-v23/styles.xml';
const STYLES_DARK_V23_XML_FILE_PATH = './res/values-night-v23/styles.xml';

const STYLE_NAME = 'Theme.App.SplashScreen';
function configureStyle(
  xml: Element,
  {
    statusBarHidden,
    statusBarStyle,
    addStatusBarBackgroundColor,
  }: {
    statusBarHidden?: boolean;
    statusBarStyle?: SplashScreenStatusBarStyleType;
    addStatusBarBackgroundColor?: boolean;
  }
): Element {
  let idx = 0;
  const result = mergeXmlElements(xml, {
    elements: [
      {
        name: 'resources',
        elements: [
          {
            name: 'style',
            attributes: {
              name: STYLE_NAME,
              parent: 'AppTheme',
            },
            elements: [
              {
                idx: idx++,
                comment: ` Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually `,
              },
              {
                idx: idx++,
                name: 'item',
                attributes: {
                  name: 'android:windowBackground',
                },
                elements: [
                  {
                    text: '@drawable/splashscreen',
                  },
                ],
              },
              {
                idx: statusBarHidden === undefined ? undefined : idx++,
                deletionFlag: statusBarHidden === undefined,
                name: 'item',
                attributes: {
                  name: 'android:windowFullscreen',
                },
                elements: [{ text: String(statusBarHidden) }],
              },
              {
                idx:
                  statusBarStyle === undefined ||
                  statusBarStyle === SplashScreenStatusBarStyle.DEFAULT
                    ? undefined
                    : idx++,
                deletionFlag:
                  statusBarStyle === undefined ||
                  statusBarStyle === SplashScreenStatusBarStyle.DEFAULT,
                name: 'item',
                attributes: {
                  name: 'android:windowLightStatusBar',
                },
                elements: [
                  {
                    text:
                      statusBarStyle === SplashScreenStatusBarStyle.LIGHT_CONTENT
                        ? 'false'
                        : statusBarStyle === SplashScreenStatusBarStyle.DARK_CONTENT
                        ? 'true'
                        : '',
                  },
                ],
              },
              {
                idx: addStatusBarBackgroundColor ? idx++ : undefined,
                deletionFlag: !addStatusBarBackgroundColor,
                name: 'item',
                attributes: {
                  name: 'android:statusBarColor',
                },
                elements: [{ text: '@color/splashscreen_statusbar_color' }],
              },
              {
                comment: ` Customize your splash screen theme here `,
              },
            ],
          },
        ],
      },
    ],
  });
  return result;
}

/**
 * Compares two subparts (`style` elements with STYLE_NAME name attribute) of given elements disregarding comments
 */
function areStyleElementsEqual(a: Element, b: Element): boolean {
  const styleA = a.elements?.[0].elements?.find(
    ({ name, attributes }) => name === 'style' && attributes?.name === STYLE_NAME
  );
  const styleB = b.elements?.[0].elements?.find(
    ({ name, attributes }) => name === 'style' && attributes?.name === STYLE_NAME
  );

  return !!styleA && !!styleB && xmlElementsEqual(styleA, styleB, { disregardComments: true });
}

/**
 * Removes `style` element with STYLE_NAME name attribute from given element.
 * Function assumes that the structure of the input `element` is correct (`element.elements[name = resources].elements[name = style, attributes.name = STYLE_NAME]`).
 */
function removeStyleElement(element: Element): Element {
  const resources = element.elements?.find(el => el.name === 'resources');
  const idxToBeRemoved =
    resources?.elements?.findIndex(
      el => el.name === 'style' && el.attributes?.name === STYLE_NAME
    ) ?? -1;
  if (idxToBeRemoved !== -1) {
    // eslint-disable-next-line no-unused-expressions
    resources?.elements?.splice(idxToBeRemoved, 1);
  }
  return element;
}

/**
 * Creates proper element structure with single `style` element disregarding all other styles.
 * Use to create more specific configuration file, but preserving previous attributes.
 * Function assumes that the structure of the input `element` is correct (`element.elements[name = resources].elements[name = style, attributes.name = STYLE_NAME]`).
 */
function elementWithStyleElement(element: Element): Element | undefined {
  const result = { ...element };
  const resources = element.elements?.find(el => el.name === 'resources');
  if (!resources) {
    return;
  }
  const styleElement = resources?.elements?.find(
    el => el.name === 'style' && el.attributes?.name === STYLE_NAME
  );
  if (!styleElement) {
    return;
  }
  result.elements = [{ ...resources, elements: [styleElement] }];
  return result;
}

/**
 * @param androidMainPath Path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
export default async function configureStylesXml(
  androidMainPath: string,
  config: {
    statusBar?: {
      style?: SplashScreenStatusBarStyleType;
      hidden?: boolean;
      backgroundColor?: Color;
    };
    darkMode?: {
      statusBar?: {
        style?: SplashScreenStatusBarStyleType;
      };
    };
  } = {}
) {
  const statusBarStyle = config.statusBar?.style ?? SplashScreenStatusBarStyle.DEFAULT;
  const statusBarHidden = config.statusBar?.hidden;
  const darkModeStatusBarStyle = config.darkMode?.statusBar?.style;
  const addStatusBarBackgroundColor = Boolean(config.statusBar?.backgroundColor);

  if (darkModeStatusBarStyle && !statusBarStyle) {
    throw new Error(
      `'darkModeStatusBarStyle' is available only if 'statusBarStyle' is provided as well.`
    );
  }

  const filePath = path.resolve(androidMainPath, STYLES_XML_FILE_PATH);
  const v23FilePath = path.resolve(androidMainPath, STYLES_V23_XML_FILE_PATH);
  const v23DarkFilePath = path.resolve(androidMainPath, STYLES_DARK_V23_XML_FILE_PATH);

  const xmlContent = await readXmlFile(filePath);
  const contentWithSingleStyle = elementWithStyleElement(xmlContent);
  const v23XmlContent = await readXmlFile(v23FilePath, contentWithSingleStyle);
  const v23DarkXmlContent = await readXmlFile(v23DarkFilePath, contentWithSingleStyle);

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
    await writeXmlFileOrRemoveFileUponNoResources(
      v23DarkFilePath,
      removeStyleElement(configuredV23DarkXmlContent)
    );
  } else {
    await writeXmlFile(v23DarkFilePath, configuredV23DarkXmlContent);
  }

  if (areStyleElementsEqual(configuredV23XmlContent, configuredXmlContent)) {
    await writeXmlFileOrRemoveFileUponNoResources(
      v23FilePath,
      removeStyleElement(configuredV23XmlContent)
    );
  } else {
    await writeXmlFile(v23FilePath, configuredV23XmlContent);
  }

  await writeXmlFile(filePath, configuredXmlContent);
}
