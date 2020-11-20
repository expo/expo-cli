import fs from 'fs-extra';
import path from 'path';
import { PNG } from 'pngjs';

import { Color } from '../SplashScreenConfig';
import { writeContentsJsonFile } from './Contents.json';

const PNG_FILENAME = 'background.png';
const DARK_PNG_FILENAME = 'dark_background.png';

const IMAGESET_PATH = 'Images.xcassets/SplashScreenBackground.imageset';
const CONTENTS_PATH = `${IMAGESET_PATH}/Contents.json`;
const PNG_PATH = `${IMAGESET_PATH}/${PNG_FILENAME}`;
const DARK_PNG_PATH = `${IMAGESET_PATH}/${DARK_PNG_FILENAME}`;

async function createContentsJsonFile(
  iosProjectPath: string,
  imageSetPath: string,
  darkModeEnabled: boolean
) {
  await fs.mkdirp(path.resolve(iosProjectPath, IMAGESET_PATH));

  await writeContentsJsonFile(
    path.resolve(iosProjectPath, CONTENTS_PATH),
    PNG_FILENAME,
    darkModeEnabled ? DARK_PNG_FILENAME : undefined
  );

  await fs.mkdirp(imageSetPath);
}

async function createPngFile(filePath: string, color: Color) {
  const png = new PNG({
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
    png.pack().pipe(fs.createWriteStream(filePath)).on('finish', resolve);
  });
}

async function createFiles(iosProjectPath: string, color: Color, darkModeColor?: Color) {
  await createPngFile(path.resolve(iosProjectPath, PNG_PATH), color);
  if (darkModeColor) {
    await createPngFile(path.resolve(iosProjectPath, DARK_PNG_PATH), darkModeColor);
  }
}

/**
 * Creates imageset containing solid color image that is used as a background for Splash Screen.
 */
export default async function configureAssets(
  iosProjectPath: string,
  config: {
    backgroundColor: Color;
    darkMode?: {
      backgroundColor?: Color;
    };
  }
) {
  const backgroundColor = config.backgroundColor;
  const darkModeBackgroundColor = config.darkMode?.backgroundColor;

  const imageSetPath = path.resolve(iosProjectPath, IMAGESET_PATH);

  // ensure old SplashScreenBackground imageSet is removed
  if (await fs.pathExists(imageSetPath)) {
    await fs.remove(imageSetPath);
  }

  await createContentsJsonFile(iosProjectPath, imageSetPath, !!darkModeBackgroundColor);
  await createFiles(iosProjectPath, backgroundColor, darkModeBackgroundColor);
}
