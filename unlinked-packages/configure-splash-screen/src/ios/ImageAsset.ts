import fs from 'fs-extra';
import path from 'path';

import { writeContentsJsonFile } from './Contents.json';

const PNG_FILENAME = 'splashscreen.png';
const DARK_PNG_FILENAME = 'dark_splashscreen.png';

const IMAGESET_PATH = 'Images.xcassets/SplashScreen.imageset';
const CONTENTS_PATH = `${IMAGESET_PATH}/Contents.json`;
const PNG_PATH = `${IMAGESET_PATH}/${PNG_FILENAME}`;
const DARK_PNG_PATH = `${IMAGESET_PATH}/${DARK_PNG_FILENAME}`;

async function createContentsJsonFile(
  iosProjectPath: string,
  imageSetPath: string,
  imagePath?: string,
  darkModeImagePath?: string
) {
  if (!imagePath) {
    return;
  }

  await fs.mkdirp(imageSetPath);
  await writeContentsJsonFile(
    path.resolve(iosProjectPath, CONTENTS_PATH),
    PNG_FILENAME,
    darkModeImagePath && DARK_PNG_FILENAME
  );
}

async function copyImageFiles(
  iosProjectPath: string,
  imagePath?: string,
  darkModeImagePath?: string
) {
  if (imagePath) {
    await fs.copyFile(imagePath, path.resolve(iosProjectPath, PNG_PATH));
  }
  if (darkModeImagePath) {
    await fs.copyFile(darkModeImagePath, path.resolve(iosProjectPath, DARK_PNG_PATH));
  }
}

/**
 * Creates imageset containing image for Splash/Launch Screen.
 */
export default async function configureImageAssets(
  iosProjectPath: string,
  config: {
    image?: string;
    darkMode?: {
      image?: string;
    };
  } = {}
) {
  const imagePath = config.image;
  const darkModeImagePath = config.darkMode?.image;

  const imageSetPath = path.resolve(iosProjectPath, IMAGESET_PATH);

  // ensure old SplashScreen imageSet is removed
  if (await fs.pathExists(imageSetPath)) {
    await fs.remove(imageSetPath);
  }

  await createContentsJsonFile(iosProjectPath, imageSetPath, imagePath, darkModeImagePath);
  await copyImageFiles(iosProjectPath, imagePath, darkModeImagePath);
}
