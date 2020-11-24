'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const color_string_1 = __importDefault(require('color-string'));
const path_1 = __importDefault(require('path'));
const xml_manipulation_1 = require('../xml-manipulation');
const COLORS_XML_FILE_PATH = './res/values/colors.xml';
const COLORS_NIGHT_XML_FILE_PATH = './res/values-night/colors.xml';
function ensureDesiredXmlContent(xml, { backgroundColor, statusBarBackgroundColor }) {
  let idx = 0;
  const result = xml_manipulation_1.mergeXmlElements(xml, {
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
 * This function converts following formats:
 * - `#RRGGBBAA` ➡️ `#AARRGGBB`,
 * - `#RGBA` ➡️ `#ARGB`.
 */
function getAndroidStyleHex(color) {
  return color_string_1.default.to
    .hex(color)
    .replace(/^(#)([0-F]{2})([0-F]{4})([0-F]{2}$)/i, '$1$4$2$3')
    .replace(/^(#)([0-F])([0-F]{2})([0-F])$/i, '$1$4$2$3');
}
/**
 * @param androidMainPath Path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
async function configureColorsXml(androidMainPath, config) {
  var _a, _b, _c, _d;
  const backgroundColor = config.backgroundColor;
  const darkModeBackgroundColor =
    (_a = config.darkMode) === null || _a === void 0 ? void 0 : _a.backgroundColor;
  const statusBarBackgroundColor =
    (_b = config.statusBar) === null || _b === void 0 ? void 0 : _b.backgroundColor;
  const darkModeStatusBarBackgroundColor =
    (_d = (_c = config.darkMode) === null || _c === void 0 ? void 0 : _c.statusBar) === null ||
    _d === void 0
      ? void 0
      : _d.backgroundColor;
  if (darkModeStatusBarBackgroundColor && !statusBarBackgroundColor) {
    throw new Error(
      `'darkModeStatusBarBackgroundColor' is available only if 'statusBarBackgroundColor' is provided as well.`
    );
  }
  const filePath = path_1.default.resolve(androidMainPath, COLORS_XML_FILE_PATH);
  const darkFilePath = path_1.default.resolve(androidMainPath, COLORS_NIGHT_XML_FILE_PATH);
  const xmlContent = await xml_manipulation_1.readXmlFile(filePath);
  const darkFileContent = await xml_manipulation_1.readXmlFile(darkFilePath);
  const configuredXmlContent = ensureDesiredXmlContent(xmlContent, {
    backgroundColor,
    statusBarBackgroundColor,
  });
  const configuredDarkXmlContent = ensureDesiredXmlContent(darkFileContent, {
    backgroundColor: darkModeBackgroundColor,
    statusBarBackgroundColor: darkModeStatusBarBackgroundColor,
  });
  await xml_manipulation_1.writeXmlFileOrRemoveFileUponNoResources(
    darkFilePath,
    configuredDarkXmlContent,
    {
      disregardComments: true,
    }
  );
  await xml_manipulation_1.writeXmlFile(filePath, configuredXmlContent);
}
exports.default = configureColorsXml;
//# sourceMappingURL=Colors.xml.js.map
