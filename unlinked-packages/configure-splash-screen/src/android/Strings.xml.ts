import path from 'path';
import { Element } from 'xml-js';

import { SplashScreenImageResizeMode, SplashScreenImageResizeModeType } from '../constants';
import { readXmlFile, writeXmlFile, mergeXmlElements } from '../xml-manipulation';

const STRINGS_XML_FILE_PATH = './res/values/strings.xml';

const DEFAULT_RESIZE_MODE = SplashScreenImageResizeMode.CONTAIN;
const DEFAULT_STATUS_BAT_TRANSLUCENT = false;

function ensureDesiredXmlContent(
  xml: Element,
  {
    imageResizeMode,
    statusBarTranslucent,
  }: {
    imageResizeMode?: SplashScreenImageResizeModeType;
    statusBarTranslucent?: boolean;
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
            deletionFlag: !imageResizeMode,
            idx: !imageResizeMode ? undefined : idx++,
            name: 'string',
            attributes: {
              name: 'expo_splash_screen_resize_mode',
              translatable: 'false',
            },
            elements: [
              {
                text: imageResizeMode ?? DEFAULT_RESIZE_MODE,
              },
            ],
          },
          {
            deletionFlag: !statusBarTranslucent,
            idx: !statusBarTranslucent ? undefined : idx++,
            name: 'string',
            attributes: {
              name: 'expo_splash_screen_status_bar_translucent',
              translatable: 'false',
            },
            elements: [
              {
                text: String(statusBarTranslucent ?? DEFAULT_STATUS_BAT_TRANSLUCENT),
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
 * @param androidMainPath Path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
export default async function configureStringsXml(
  androidMainPath: string,
  config: {
    imageResizeMode?: SplashScreenImageResizeModeType;
    statusBar?: {
      translucent?: boolean;
    };
  } = {}
) {
  const imageResizeMode = config.imageResizeMode ?? SplashScreenImageResizeMode.CONTAIN;
  const statusBarTranslucent: boolean = config.statusBar?.translucent ?? false;

  const filePath = path.resolve(androidMainPath, STRINGS_XML_FILE_PATH);

  const xmlContent = await readXmlFile(filePath);

  const configuredXmlContent = ensureDesiredXmlContent(xmlContent, {
    imageResizeMode,
    statusBarTranslucent,
  });

  await writeXmlFile(filePath, configuredXmlContent);
}
