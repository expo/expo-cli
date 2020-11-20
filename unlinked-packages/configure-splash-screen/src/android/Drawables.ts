import fs from 'fs-extra';
import path from 'path';

const SPLASH_SCREEN_FILENAME = 'splashscreen_image.png';

type DRAWABLE_SIZE = 'default' | 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';
type THEME = 'light' | 'dark';

const DRAWABLES_CONFIGS: {
  [key in DRAWABLE_SIZE]: {
    modes: {
      [key in THEME]: {
        path: string;
      };
    };
    dimensionsMultiplier: number;
  };
} = {
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
 */
export default async function configureDrawables(
  androidMainPath: string,
  config: {
    image?: string;
    darkMode?: {
      image?: string;
    };
  } = {}
) {
  await Promise.all(
    Object.values(DRAWABLES_CONFIGS).map(async ({ modes }) => {
      await Promise.all(
        Object.values(modes).map(async ({ path: filePath }) => {
          if (await fs.pathExists(path.resolve(androidMainPath, filePath))) {
            await fs.remove(path.resolve(androidMainPath, filePath));
          }
        })
      );
    })
  );

  await Promise.all([
    copyDrawableFile(
      config.image,
      path.resolve(androidMainPath, DRAWABLES_CONFIGS.default.modes.light.path)
    ),
    copyDrawableFile(
      config.darkMode?.image,
      path.resolve(androidMainPath, DRAWABLES_CONFIGS.default.modes.dark.path)
    ),
  ]);
}
