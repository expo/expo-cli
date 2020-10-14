'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const fs_extra_1 = __importDefault(require('fs-extra'));
const path_1 = __importDefault(require('path'));

const Contents_json_1 = require('./Contents.json');
const PNG_FILENAME = 'splashscreen.png';
const DARK_PNG_FILENAME = 'dark_splashscreen.png';
const IMAGESET_PATH = 'Images.xcassets/SplashScreen.imageset';
const CONTENTS_PATH = `${IMAGESET_PATH}/Contents.json`;
const PNG_PATH = `${IMAGESET_PATH}/${PNG_FILENAME}`;
const DARK_PNG_PATH = `${IMAGESET_PATH}/${DARK_PNG_FILENAME}`;
async function createContentsJsonFile(iosProjectPath, imageSetPath, imagePath, darkModeImagePath) {
  if (!imagePath) {
    return;
  }
  await fs_extra_1.default.mkdirp(imageSetPath);
  await Contents_json_1.writeContentsJsonFile(
    path_1.default.resolve(iosProjectPath, CONTENTS_PATH),
    PNG_FILENAME,
    darkModeImagePath && DARK_PNG_FILENAME
  );
}
async function copyImageFiles(iosProjectPath, imagePath, darkModeImagePath) {
  if (imagePath) {
    await fs_extra_1.default.copyFile(imagePath, path_1.default.resolve(iosProjectPath, PNG_PATH));
  }
  if (darkModeImagePath) {
    await fs_extra_1.default.copyFile(
      darkModeImagePath,
      path_1.default.resolve(iosProjectPath, DARK_PNG_PATH)
    );
  }
}
/**
 * Creates imageset containing image for Splash/Launch Screen.
 */
async function configureImageAssets(iosProjectPath, config = {}) {
  var _a;
  const imagePath = config.image;
  const darkModeImagePath = (_a = config.darkMode) === null || _a === void 0 ? void 0 : _a.image;
  const imageSetPath = path_1.default.resolve(iosProjectPath, IMAGESET_PATH);
  // ensure old SplashScreen imageSet is removed
  if (await fs_extra_1.default.pathExists(imageSetPath)) {
    await fs_extra_1.default.remove(imageSetPath);
  }
  await createContentsJsonFile(iosProjectPath, imageSetPath, imagePath, darkModeImagePath);
  await copyImageFiles(iosProjectPath, imagePath, darkModeImagePath);
}
exports.default = configureImageAssets;
//# sourceMappingURL=ImageAsset.js.map
