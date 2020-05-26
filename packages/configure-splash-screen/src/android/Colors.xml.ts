import colorString, { ColorDescriptor } from 'color-string';
import path from 'path';
import { Element } from 'xml-js';

import {
  readXmlFile,
  writeXmlFile,
  mergeXmlElements,
  writeXmlFileOrRemoveFileUponNoResources,
} from '../xml-manipulation';

const COLORS_XML_FILE_PATH = './res/values/colors.xml';
const COLORS_NIGHT_XML_FILE_PATH = './res/values-night/colors.xml';

function ensureDesiredXmlContent(
  xml: Element,
  {
    backgroundColor,
    statusBarBackgroundColor,
  }: {
    backgroundColor?: ColorDescriptor;
    statusBarBackgroundColor?: ColorDescriptor;
  }
): Element {
  let idx = 0;
  const result = mergeXmlElements(xml, {
    elements: [
      {
        name: 'resources',
        elements: [
          {
            idx: idx++,
            comment: ` Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually `,
          },
          {
            deletionFlag: !backgroundColor,
            idx: !backgroundColor ? undefined : idx++,
            name: 'color',
            attributes: {
              name: 'splashscreen_background',
            },
            elements: [
              {
                text: backgroundColor ? getAndroidStyleHex(backgroundColor) : '',
              },
            ],
          },
          {
            deletionFlag: !statusBarBackgroundColor,
            idx: !statusBarBackgroundColor ? undefined : idx++,
            name: 'color',
            attributes: {
              name: 'splashscreen_statusbar_color',
            },
            elements: [
              {
                text: statusBarBackgroundColor ? getAndroidStyleHex(statusBarBackgroundColor) : '',
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
 * css-recognized hex is of format `#RRGGBB(AA)` or `#RGB(A)`, while Android accepts `#(AA)RRGGBB` or `#(A)RGB` (https://developer.android.com/guide/topics/resources/color-list-resource)
 * This function converts only format `#RRGGBBAA` into `#AARRGGBB`.
 */
function getAndroidStyleHex(color: ColorDescriptor): string {
  return colorString.to
    .hex(color.value)
    .replace(/^(#)([0-F]{2})([0-F]{4})([0-F]{2}$)/i, '$1$4$2$3')
    .replace(/^(#)([0-F])([0-F]{2})([0-F])$/i, '$1$4$2$3');
}

/**
 * @param androidMainPath Path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
export default async function configureColorsXml(
  androidMainPath: string,
  {
    backgroundColor,
    darkModeBackgroundColor,
    statusBarBackgroundColor,
    darkModeStatusBarBackgroundColor,
  }: {
    backgroundColor: ColorDescriptor;
    darkModeBackgroundColor?: ColorDescriptor;
    statusBarBackgroundColor?: ColorDescriptor;
    darkModeStatusBarBackgroundColor?: ColorDescriptor;
  }
) {
  if (darkModeStatusBarBackgroundColor && !darkModeStatusBarBackgroundColor) {
    throw new Error(
      `'darkModeStatusBarBackgroundColor' is available only if 'statusBarBackgroundColor' is provided as well.`
    );
  }

  const filePath = path.resolve(androidMainPath, COLORS_XML_FILE_PATH);
  const darkFilePath = path.resolve(androidMainPath, COLORS_NIGHT_XML_FILE_PATH);

  const xmlContent = await readXmlFile(filePath);
  const darkFileContent = await readXmlFile(darkFilePath);

  const configuredXmlContent = ensureDesiredXmlContent(xmlContent, {
    backgroundColor,
    statusBarBackgroundColor,
  });

  const configuredDarkXmlContent = ensureDesiredXmlContent(darkFileContent, {
    backgroundColor: darkModeBackgroundColor,
    statusBarBackgroundColor: darkModeStatusBarBackgroundColor,
  });

  await writeXmlFileOrRemoveFileUponNoResources(darkFilePath, configuredDarkXmlContent, {
    disregardComments: true,
  });
  await writeXmlFile(filePath, configuredXmlContent);
}
