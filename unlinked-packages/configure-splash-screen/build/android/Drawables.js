'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const fs_extra_1 = __importDefault(require('fs-extra'));
const path_1 = __importDefault(require('path'));
const SPLASH_SCREEN_FILENAME = 'splashscreen_image.png';
const DRAWABLES_CONFIGS = {
  default: {
    modes: {
      light: {
        path: `./res/drawable/${SPLASH_SCREEN_FILENAME}`,
      },
      dark: {
        path: `./res/drawable-night/${SPLASH_SCREEN_FILENAME}`,
      },
    },
    dimensionsMultiplier: 1,
  },
  mdpi: {
    modes: {
      light: {
        path: `./res/drawable-mdpi/${SPLASH_SCREEN_FILENAME}`,
      },
      dark: {
        path: `./res/drawable-night-mdpi/${SPLASH_SCREEN_FILENAME}`,
      },
    },
    dimensionsMultiplier: 1,
  },
  hdpi: {
    modes: {
      light: {
        path: `./res/drawable-hdpi/${SPLASH_SCREEN_FILENAME}`,
      },
      dark: {
        path: `./res/drawable-night-hdpi/${SPLASH_SCREEN_FILENAME}`,
      },
    },
    dimensionsMultiplier: 1.5,
  },
  xhdpi: {
    modes: {
      light: {
        path: `./res/drawable-xhdpi/${SPLASH_SCREEN_FILENAME}`,
      },
      dark: {
        path: `./res/drawable-night-xhdpi/${SPLASH_SCREEN_FILENAME}`,
      },
    },
    dimensionsMultiplier: 2,
  },
  xxhdpi: {
    modes: {
      light: {
        path: `./res/drawable-xxhdpi/${SPLASH_SCREEN_FILENAME}`,
      },
      dark: {
        path: `./res/drawable-night-xxhdpi/${SPLASH_SCREEN_FILENAME}`,
      },
    },
    dimensionsMultiplier: 3,
  },
  xxxhdpi: {
    modes: {
      light: {
        path: `./res/drawable-xxxhdpi/${SPLASH_SCREEN_FILENAME}`,
      },
      dark: {
        path: `./res/drawable-night-xxxhdpi/${SPLASH_SCREEN_FILENAME}`,
      },
    },
    dimensionsMultiplier: 4,
  },
};
/**
 * @param srcPath Absolute path
 * @param dstPath Absolute path
 */
async function copyDrawableFile(srcPath, dstPath) {
  if (!srcPath) {
    return;
  }
  if (!(await fs_extra_1.default.pathExists(path_1.default.dirname(dstPath)))) {
    await fs_extra_1.default.mkdir(path_1.default.dirname(dstPath));
  }
  await fs_extra_1.default.copyFile(srcPath, path_1.default.resolve(dstPath));
}
/**
 * Deletes all previous splash_screen_images and copies new one to desired drawable directory.
 * If path isn't provided then no new image is placed in drawable directories.
 * @see https://developer.android.com/training/multiscreen/screendensities
 *
 * @param androidMainPath Absolute path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 */
async function configureDrawables(androidMainPath, config = {}) {
  var _a;
  await Promise.all(
    Object.values(DRAWABLES_CONFIGS).map(async ({ modes }) => {
      await Promise.all(
        Object.values(modes).map(async ({ path: filePath }) => {
          if (
            await fs_extra_1.default.pathExists(path_1.default.resolve(androidMainPath, filePath))
          ) {
            await fs_extra_1.default.remove(path_1.default.resolve(androidMainPath, filePath));
          }
        })
      );
    })
  );
  await Promise.all([
    copyDrawableFile(
      config.image,
      path_1.default.resolve(androidMainPath, DRAWABLES_CONFIGS.default.modes.light.path)
    ),
    copyDrawableFile(
      (_a = config.darkMode) === null || _a === void 0 ? void 0 : _a.image,
      path_1.default.resolve(androidMainPath, DRAWABLES_CONFIGS.default.modes.dark.path)
    ),
  ]);
}
exports.default = configureDrawables;
//# sourceMappingURL=Drawables.js.map
