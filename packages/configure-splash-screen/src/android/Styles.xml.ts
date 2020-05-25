import path from 'path';
import { Element } from 'xml-js';

import fs from 'fs-extra';
import { readXmlFile, writeXmlFile, mergeXmlElements, xmlElementsEqual } from '../xml-manipulation';
import { StatusBarStyle, ResizeMode } from '../constants';

const STYLES_XML_FILE_PATH = './res/values/styles.xml';
const STYLES_DARK_XML_FILE_PATH = './res/values-night/styles.xml';
const STYLES_V23_XML_FILE_PATH = './res/values-v23/styles.xml';
const STYLES_DARK_V23_XML_FILE_PATH = './res/values-night-v23/styles.xml';

const STYLE_NAME = 'Theme.App.SplashScreen';

function configureStyle(
  xml: Element,
  {
    statusBarHidden,
    statusBarStyle,
  }: { statusBarHidden?: boolean; statusBarStyle?: StatusBarStyle }
): Element {
  const result = mergeXmlElements(xml, {
    elements: [
      {
        name: 'resources',
        elements: [
          {
            name: 'style',
            attributes: {
              name: STYLE_NAME,
              parent: 'Theme.AppCompat.Light.NoActionBar',
            },
            elements: [
              {
                idx: 0,
                comment: ` Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually `,
              },
              {
                idx: 1,
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
                idx: 2,
                deletionFlag: statusBarHidden === undefined,
                name: 'item',
                attributes: {
                  name: 'android:windowFullscreen',
                },
                elements: [{ text: String(statusBarHidden) }],
              },
              {
                idx: statusBarHidden === undefined ? 2 : 3,
                deletionFlag:
                  statusBarStyle === undefined || statusBarStyle === StatusBarStyle.DEFAULT,
                name: 'item',
                attributes: {
                  name: 'android:windowLightStatusBar',
                },
                elements: [
                  {
                    text:
                      statusBarStyle === StatusBarStyle.LIGHT_CONTENT
                        ? 'false'
                        : statusBarStyle === StatusBarStyle.DARK_CONTENT
                        ? 'true'
                        : '',
                  },
                ],
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
 * Created proper element structure with single `style` element disregarding all other styles.
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
 * Check if given newContent has some meaningful data:
 * - if so: write it to the file
 * - if no: remove file completely
 * Function assumes that the structure of the input `element` is correct (`element.elements[name = resources]`).
 */
async function writeXmlFileOrRemoveFileUponNoContent(filePath: string, element: Element) {
  if (element.elements?.[0].name === 'resources' && element.elements[0].elements?.length === 0) {
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
    }
  } else {
    await writeXmlFile(filePath, element);
  }
}

/**
 * @param androidMainPath Path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
export default async function configureStylesXml(
  androidMainPath: string,
  {
    statusBarHidden,
    statusBarStyle = StatusBarStyle.DEFAULT,
    darkModeStatusBarStyle,
  }: {
    statusBarHidden?: boolean;
    statusBarStyle?: StatusBarStyle;
    darkModeStatusBarStyle?: StatusBarStyle;
  } = {}
) {
  const filePath = path.resolve(androidMainPath, STYLES_XML_FILE_PATH);
  const v23FilePath = path.resolve(androidMainPath, STYLES_V23_XML_FILE_PATH);
  const v23DarkFilePath = path.resolve(androidMainPath, STYLES_DARK_V23_XML_FILE_PATH);

  const xmlContent = await readXmlFile(filePath);
  const contentWithSingleStyle = elementWithStyleElement(xmlContent);
  const v23XmlContent = await readXmlFile(v23FilePath, contentWithSingleStyle);
  const v23DarkXmlContent = await readXmlFile(v23DarkFilePath, contentWithSingleStyle);

  const configuredXmlContent = configureStyle(xmlContent, { statusBarHidden });
  const configuredV23XmlContent = configureStyle(v23XmlContent, {
    statusBarHidden,
    statusBarStyle,
  });
  const configuredV23DarkXmlContent = configureStyle(v23DarkXmlContent, {
    statusBarHidden,
    statusBarStyle: darkModeStatusBarStyle ?? statusBarStyle,
  });

  if (areStyleElementsEqual(configuredV23DarkXmlContent, configuredV23XmlContent)) {
    await writeXmlFileOrRemoveFileUponNoContent(
      v23DarkFilePath,
      removeStyleElement(configuredV23DarkXmlContent)
    );
  } else {
    await writeXmlFile(v23DarkFilePath, configuredV23DarkXmlContent);
  }

  if (areStyleElementsEqual(configuredV23XmlContent, configuredXmlContent)) {
    await writeXmlFileOrRemoveFileUponNoContent(
      v23FilePath,
      removeStyleElement(configuredV23XmlContent)
    );
  } else {
    await writeXmlFile(v23FilePath, configuredV23XmlContent);
  }

  await writeXmlFile(filePath, configuredXmlContent);
}
