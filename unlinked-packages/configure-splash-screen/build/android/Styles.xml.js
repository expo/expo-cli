'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const path_1 = __importDefault(require('path'));

const constants_1 = require('../constants');
const xml_manipulation_1 = require('../xml-manipulation');
const STYLES_XML_FILE_PATH = './res/values/styles.xml';
const STYLES_V23_XML_FILE_PATH = './res/values-v23/styles.xml';
const STYLES_DARK_V23_XML_FILE_PATH = './res/values-night-v23/styles.xml';
const STYLE_NAME = 'Theme.App.SplashScreen';
function configureStyle(xml, { statusBarHidden, statusBarStyle, addStatusBarBackgroundColor }) {
  let idx = 0;
  const result = xml_manipulation_1.mergeXmlElements(xml, {
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
                  statusBarStyle === constants_1.SplashScreenStatusBarStyle.DEFAULT
                    ? undefined
                    : idx++,
                deletionFlag:
                  statusBarStyle === undefined ||
                  statusBarStyle === constants_1.SplashScreenStatusBarStyle.DEFAULT,
                name: 'item',
                attributes: {
                  name: 'android:windowLightStatusBar',
                },
                elements: [
                  {
                    text:
                      statusBarStyle === constants_1.SplashScreenStatusBarStyle.LIGHT_CONTENT
                        ? 'false'
                        : statusBarStyle === constants_1.SplashScreenStatusBarStyle.DARK_CONTENT
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
function areStyleElementsEqual(a, b) {
  var _a, _b, _c, _d;
  const styleA =
    (_b = (_a = a.elements) === null || _a === void 0 ? void 0 : _a[0].elements) === null ||
    _b === void 0
      ? void 0
      : _b.find(
          ({ name, attributes }) =>
            name === 'style' &&
            (attributes === null || attributes === void 0 ? void 0 : attributes.name) === STYLE_NAME
        );
  const styleB =
    (_d = (_c = b.elements) === null || _c === void 0 ? void 0 : _c[0].elements) === null ||
    _d === void 0
      ? void 0
      : _d.find(
          ({ name, attributes }) =>
            name === 'style' &&
            (attributes === null || attributes === void 0 ? void 0 : attributes.name) === STYLE_NAME
        );
  return (
    !!styleA &&
    !!styleB &&
    xml_manipulation_1.xmlElementsEqual(styleA, styleB, { disregardComments: true })
  );
}
/**
 * Removes `style` element with STYLE_NAME name attribute from given element.
 * Function assumes that the structure of the input `element` is correct (`element.elements[name = resources].elements[name = style, attributes.name = STYLE_NAME]`).
 */
function removeStyleElement(element) {
  var _a, _b, _c, _d;
  const resources =
    (_a = element.elements) === null || _a === void 0
      ? void 0
      : _a.find(el => el.name === 'resources');
  const idxToBeRemoved =
    (_c =
      (_b = resources === null || resources === void 0 ? void 0 : resources.elements) === null ||
      _b === void 0
        ? void 0
        : _b.findIndex(el => {
            var _a;
            return (
              el.name === 'style' &&
              ((_a = el.attributes) === null || _a === void 0 ? void 0 : _a.name) === STYLE_NAME
            );
          })) !== null && _c !== void 0
      ? _c
      : -1;
  if (idxToBeRemoved !== -1) {
    // eslint-disable-next-line no-unused-expressions
    (_d = resources === null || resources === void 0 ? void 0 : resources.elements) === null ||
    _d === void 0
      ? void 0
      : _d.splice(idxToBeRemoved, 1);
  }
  return element;
}
/**
 * Creates proper element structure with single `style` element disregarding all other styles.
 * Use to create more specific configuration file, but preserving previous attributes.
 * Function assumes that the structure of the input `element` is correct (`element.elements[name = resources].elements[name = style, attributes.name = STYLE_NAME]`).
 */
function elementWithStyleElement(element) {
  var _a, _b;
  const result = { ...element };
  const resources =
    (_a = element.elements) === null || _a === void 0
      ? void 0
      : _a.find(el => el.name === 'resources');
  if (!resources) {
    return;
  }
  const styleElement =
    (_b = resources === null || resources === void 0 ? void 0 : resources.elements) === null ||
    _b === void 0
      ? void 0
      : _b.find(el => {
          var _a;
          return (
            el.name === 'style' &&
            ((_a = el.attributes) === null || _a === void 0 ? void 0 : _a.name) === STYLE_NAME
          );
        });
  if (!styleElement) {
    return;
  }
  result.elements = [{ ...resources, elements: [styleElement] }];
  return result;
}
/**
 * @param androidMainPath Path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
async function configureStylesXml(androidMainPath, config = {}) {
  var _a, _b, _c, _d, _e, _f;
  const statusBarStyle =
    (_b = (_a = config.statusBar) === null || _a === void 0 ? void 0 : _a.style) !== null &&
    _b !== void 0
      ? _b
      : constants_1.SplashScreenStatusBarStyle.DEFAULT;
  const statusBarHidden = (_c = config.statusBar) === null || _c === void 0 ? void 0 : _c.hidden;
  const darkModeStatusBarStyle =
    (_e = (_d = config.darkMode) === null || _d === void 0 ? void 0 : _d.statusBar) === null ||
    _e === void 0
      ? void 0
      : _e.style;
  const addStatusBarBackgroundColor = Boolean(
    (_f = config.statusBar) === null || _f === void 0 ? void 0 : _f.backgroundColor
  );
  if (darkModeStatusBarStyle && !statusBarStyle) {
    throw new Error(
      `'darkModeStatusBarStyle' is available only if 'statusBarStyle' is provided as well.`
    );
  }
  const filePath = path_1.default.resolve(androidMainPath, STYLES_XML_FILE_PATH);
  const v23FilePath = path_1.default.resolve(androidMainPath, STYLES_V23_XML_FILE_PATH);
  const v23DarkFilePath = path_1.default.resolve(androidMainPath, STYLES_DARK_V23_XML_FILE_PATH);
  const xmlContent = await xml_manipulation_1.readXmlFile(filePath);
  const contentWithSingleStyle = elementWithStyleElement(xmlContent);
  const v23XmlContent = await xml_manipulation_1.readXmlFile(v23FilePath, contentWithSingleStyle);
  const v23DarkXmlContent = await xml_manipulation_1.readXmlFile(
    v23DarkFilePath,
    contentWithSingleStyle
  );
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
    statusBarStyle:
      darkModeStatusBarStyle !== null && darkModeStatusBarStyle !== void 0
        ? darkModeStatusBarStyle
        : statusBarStyle,
    addStatusBarBackgroundColor,
  });
  if (areStyleElementsEqual(configuredV23DarkXmlContent, configuredV23XmlContent)) {
    await xml_manipulation_1.writeXmlFileOrRemoveFileUponNoResources(
      v23DarkFilePath,
      removeStyleElement(configuredV23DarkXmlContent)
    );
  } else {
    await xml_manipulation_1.writeXmlFile(v23DarkFilePath, configuredV23DarkXmlContent);
  }
  if (areStyleElementsEqual(configuredV23XmlContent, configuredXmlContent)) {
    await xml_manipulation_1.writeXmlFileOrRemoveFileUponNoResources(
      v23FilePath,
      removeStyleElement(configuredV23XmlContent)
    );
  } else {
    await xml_manipulation_1.writeXmlFile(v23FilePath, configuredV23XmlContent);
  }
  await xml_manipulation_1.writeXmlFile(filePath, configuredXmlContent);
}
exports.default = configureStylesXml;
//# sourceMappingURL=Styles.xml.js.map
