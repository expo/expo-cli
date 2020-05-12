import fs from 'fs-extra';
import path from 'path';
import colorString, { ColorDescriptor } from 'color-string';
import sharp from 'sharp';

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

async function createPngFile(filePath: string, color: ColorDescriptor) {
  const fileContent = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: colorString.to.rgb(color.value),
    },
  })
    .png()
    .toBuffer();
  await fs.writeFile(filePath, fileContent);
}

async function createFiles(
  iosProjectPath: string,
  color: ColorDescriptor,
  darkModeColor?: ColorDescriptor
) {
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
  color: ColorDescriptor,
  darkModeColor?: ColorDescriptor
) {
  const imageSetPath = path.resolve(iosProjectPath, IMAGESET_PATH);

  // ensure old SplashScreenBackground imageSet is removed
  if (await fs.pathExists(imageSetPath)) {
    await fs.remove(imageSetPath);
  }

  await createContentsJsonFile(iosProjectPath, imageSetPath, !!darkModeColor);
  await createFiles(iosProjectPath, color, darkModeColor);
}
