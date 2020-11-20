'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const fs_extra_1 = __importDefault(require('fs-extra'));
const path_1 = __importDefault(require('path'));
const pngjs_1 = require('pngjs');

const Contents_json_1 = require('./Contents.json');
const PNG_FILENAME = 'background.png';
const DARK_PNG_FILENAME = 'dark_background.png';
const IMAGESET_PATH = 'Images.xcassets/SplashScreenBackground.imageset';
const CONTENTS_PATH = `${IMAGESET_PATH}/Contents.json`;
const PNG_PATH = `${IMAGESET_PATH}/${PNG_FILENAME}`;
const DARK_PNG_PATH = `${IMAGESET_PATH}/${DARK_PNG_FILENAME}`;
async function createContentsJsonFile(iosProjectPath, imageSetPath, darkModeEnabled) {
  await fs_extra_1.default.mkdirp(path_1.default.resolve(iosProjectPath, IMAGESET_PATH));
  await Contents_json_1.writeContentsJsonFile(
    path_1.default.resolve(iosProjectPath, CONTENTS_PATH),
    PNG_FILENAME,
    darkModeEnabled ? DARK_PNG_FILENAME : undefined
  );
  await fs_extra_1.default.mkdirp(imageSetPath);
}
async function createPngFile(filePath, color) {
  const png = new pngjs_1.PNG({
    width: 1,
    height: 1,
    bitDepth: 8,
    colorType: 6,
    inputColorType: 6,
    inputHasAlpha: true,
  });
  const [r, g, b, a] = color;
  const bitmap = new Uint8Array([r, g, b, a * 255]);
  const buffer = Buffer.from(bitmap);
  png.data = buffer;
  return new Promise(resolve => {
    png.pack().pipe(fs_extra_1.default.createWriteStream(filePath)).on('finish', resolve);
  });
}
async function createFiles(iosProjectPath, color, darkModeColor) {
  await createPngFile(path_1.default.resolve(iosProjectPath, PNG_PATH), color);
  if (darkModeColor) {
    await createPngFile(path_1.default.resolve(iosProjectPath, DARK_PNG_PATH), darkModeColor);
  }
}
/**
 * Creates imageset containing solid color image that is used as a background for Splash Screen.
 */
async function configureAssets(iosProjectPath, config) {
  var _a;
  const backgroundColor = config.backgroundColor;
  const darkModeBackgroundColor =
    (_a = config.darkMode) === null || _a === void 0 ? void 0 : _a.backgroundColor;
  const imageSetPath = path_1.default.resolve(iosProjectPath, IMAGESET_PATH);
  // ensure old SplashScreenBackground imageSet is removed
  if (await fs_extra_1.default.pathExists(imageSetPath)) {
    await fs_extra_1.default.remove(imageSetPath);
  }
  await createContentsJsonFile(iosProjectPath, imageSetPath, !!darkModeBackgroundColor);
  await createFiles(iosProjectPath, backgroundColor, darkModeBackgroundColor);
}
exports.default = configureAssets;
//# sourceMappingURL=BackgroundAsset.js.map
