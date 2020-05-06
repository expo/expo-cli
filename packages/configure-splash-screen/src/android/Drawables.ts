import fs from 'fs-extra';
import path from 'path';

const SPLASH_SCREEN_FILENAME = 'splashscreen_image.png';

const DRAWABLES_CONFIGS = {
  default: {
    path: `./res/drawable/${SPLASH_SCREEN_FILENAME}`,
    darkModePath: `./res/drawable-night/${SPLASH_SCREEN_FILENAME}`,
    dimensionsMultiplier: 1,
  },
  mdpi: {
    path: `./res/drawable-mdpi/${SPLASH_SCREEN_FILENAME}`,
    darkModePath: `./res/drawable-night-mdpi/${SPLASH_SCREEN_FILENAME}`,
    dimensionsMultiplier: 1,
  },
  hdpi: {
    path: `./res/drawable-hdpi/${SPLASH_SCREEN_FILENAME}`,
    darkModePath: `./res/drawable-night-hdpi/${SPLASH_SCREEN_FILENAME}`,
    dimensionsMultiplier: 1.5,
  },
  xhdpi: {
    path: `./res/drawable-xhdpi/${SPLASH_SCREEN_FILENAME}`,
    darkModePath: `./res/drawable-night-xhdpi/${SPLASH_SCREEN_FILENAME}`,
    dimensionsMultiplier: 2,
  },
  xxhdpi: {
    path: `./res/drawable-xxhdpi/${SPLASH_SCREEN_FILENAME}`,
    darkModePath: `./res/drawable-night-xxhdpi/${SPLASH_SCREEN_FILENAME}`,
    dimensionsMultiplier: 3,
  },
  xxxhdpi: {
    path: `./res/drawable-xxxhdpi/${SPLASH_SCREEN_FILENAME}`,
    darkModePath: `./res/drawable-night-xxxhdpi/${SPLASH_SCREEN_FILENAME}`,
    dimensionsMultiplier: 4,
  },
};

/**
 * @param srcPath Absolute path
 * @param dstPath Absolute path
 */
async function copyDrawableFile(srcPath: string | undefined, dstPath: string) {
  if (!srcPath) {
    return;
  }
  if (!(await fs.pathExists(path.dirname(dstPath)))) {
    await fs.mkdir(path.dirname(dstPath));
  }
  await fs.copyFile(srcPath, path.resolve(dstPath));
}

/**
 * Deletes all previous splash_screen_images and copies new one to desired drawable directory.
 * If path isn't provided then no new image is placed in drawable directories.
 * @see https://developer.android.com/training/multiscreen/screendensities
 *
 * @param androidMainPath Absolute path to the main directory containing code and resources in Android project. In general that would be `android/app/src/main`.
 * @param splashScreenImagePath Absolute path
 * @param darkModeSplashScreenImagePath Absolute path
 */
export default async function configureDrawables(
  androidMainPath: string,
  splashScreenImagePath?: string,
  darkModeSplashScreenImagePath?: string
) {
  await Promise.all(
    Object.values(DRAWABLES_CONFIGS).map(
      async ({ path: drawbalePath, darkModePath: darkModeDrawablePath }) => {
        await Promise.all(
          [drawbalePath, darkModeDrawablePath].map(async filePath => {
            if (await fs.pathExists(path.resolve(androidMainPath, filePath))) {
              await fs.remove(path.resolve(androidMainPath, filePath));
            }
          })
        );
      }
    )
  );

  await Promise.all([
    copyDrawableFile(
      splashScreenImagePath,
      path.resolve(androidMainPath, DRAWABLES_CONFIGS.default.path)
    ),
    copyDrawableFile(
      darkModeSplashScreenImagePath,
      path.resolve(androidMainPath, DRAWABLES_CONFIGS.default.darkModePath)
    ),
  ]);
}
