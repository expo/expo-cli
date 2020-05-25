import colorString, { ColorDescriptor } from 'color-string';
import path from 'path';
import { Element } from 'xml-js';

import { readXmlFile, writeXmlFile, mergeXmlElements } from '../xml-manipulation';

const COLORS_XML_FILE_PATH = './res/values/colors.xml';
const COLORS_NIGHT_XML_FILE_PATH = './res/values-night/colors.xml';

function ensureDesiredXmlContent(xml: Element, backgroundColor: ColorDescriptor): Element {
  const result = mergeXmlElements(xml, {
    elements: [
      {
        name: 'resources',
        elements: [
          {
            idx: 0,
            comment: ` Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually `,
          },
          {
            idx: 1,
            name: 'color',
            attributes: {
              name: 'splashscreen_background',
            },
            elements: [
              {
                text: colorString.to.hex(backgroundColor.value),
              },
            ],
          },
        ],
      },
    ],
  });
  return result;
}

async function configureBackgroundColorForFile(
  filePath: string,
  backgroundColor?: ColorDescriptor
) {
  if (!backgroundColor) {
    return;
  }
  const xmlContent = await readXmlFile(filePath);
  const configuredXmlContent = ensureDesiredXmlContent(xmlContent, backgroundColor);
  await writeXmlFile(filePath, configuredXmlContent);
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
  await Promise.all([
    configureBackgroundColorForFile(
      path.resolve(androidMainPath, COLORS_XML_FILE_PATH),
      backgroundColor
    ),
    configureBackgroundColorForFile(
      path.resolve(androidMainPath, COLORS_NIGHT_XML_FILE_PATH),
      darkModeBackgroundColor
    ),
  ]);
}
