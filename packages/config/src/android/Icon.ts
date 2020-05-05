import { generateImageAsync } from '@expo/image-utils';
import { resolve } from 'path';
import jimp from 'jimp';
import fs from 'fs-extra';
import { ExpoConfig } from '../Config.types';

const IC_LAUNCHER_XML_TEMPLATE = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;

type dpiMap = { [dpistring: string]: { folderName: string; scale: number } };

const dpiValues: dpiMap = {
  xxxhdpi: { folderName: 'mipmap-xxxhdpi', scale: 4 },
  xxhdpi: { folderName: 'mipmap-xxhdpi', scale: 3 },
  xhdpi: { folderName: 'mipmap-xhdpi', scale: 2 },
  hdpi: { folderName: 'mipmap-hdpi', scale: 1.5 },
  mdpi: { folderName: 'mipmap-mdpi', scale: 1 },
};

const ANDROID_RES_PATH = 'android/app/src/main/res/';
const IC_LAUNCHER_PNG = 'ic_launcher.png';
const IC_LAUNCHER_ROUND_PNG = 'ic_launcher_round.png';
const IC_LAUNCHER_BACKGROUND_PNG = 'ic_launcher_background.png';
const IC_LAUNCHER_FOREGROUND_PNG = 'ic_launcher_foreground.png';

export function getIcon(config: ExpoConfig) {
  return config.icon || config.android?.icon || null;
}

export function getAdaptiveIcon(config: ExpoConfig) {
  return {
    foregroundImage: config.android?.adaptiveIcon?.foregroundImage ?? null,
    backgroundColor: config.android?.adaptiveIcon?.backgroundColor ?? '#FFFFFF',
    backgroundImage: config.android?.adaptiveIcon?.backgroundImage ?? null,
  };
}

export async function setIconAsync(config: ExpoConfig, projectRoot: string) {
  const { foregroundImage, backgroundColor, backgroundImage } = getAdaptiveIcon(config);
  let icon = foregroundImage || getIcon(config);

  if (!icon) {
    return;
  }

  const iconPath = resolve(projectRoot, icon);
  let width, height;

  // Legacy Icon for Android 7 and earlier
  for (let dpi in dpiValues) {
    const { folderName, scale } = dpiValues[dpi];
    let destinationPathRegular = resolve(
      projectRoot,
      ANDROID_RES_PATH,
      folderName,
      IC_LAUNCHER_PNG
    );
    let destinationPathRound = resolve(
      projectRoot,
      ANDROID_RES_PATH,
      folderName,
      IC_LAUNCHER_ROUND_PNG
    );
    width = height = 48 * scale;

    try {
      let iconImage = await resizeImageAsync(projectRoot, iconPath, width, height);
      if (backgroundImage && foregroundImage) {
        // if a background image is supplied, layer the foreground on top of that image.
        let resizedBackgroundImage = await resizeImageAsync(projectRoot, iconPath, width, height);
        iconImage = resizedBackgroundImage.composite(iconImage, 0, 0);
      }
      iconImage.write(destinationPathRegular);
      iconImage.write(destinationPathRound);
    } catch (e) {
      throw new Error('Encountered an issue resizing app icon: ' + e);
    }
  }

  if (!foregroundImage) {
    // If no foreground image, we shouldn't configure the Android Adaptive Icon
    return;
  }

  // Adaptive Icon
  for (let dpi in dpiValues) {
    const { folderName, scale } = dpiValues[dpi];
    width = height = 48 * scale;
    let destinationPathAdaptiveIconForeground = resolve(
      projectRoot,
      ANDROID_RES_PATH,
      folderName,
      IC_LAUNCHER_FOREGROUND_PNG
    );
    let destinationPathAdaptiveIconBackground = resolve(
      projectRoot,
      ANDROID_RES_PATH,
      folderName,
      IC_LAUNCHER_BACKGROUND_PNG
    );

    try {
      let finalAdpativeIconForeground = await resizeImageAsync(
        projectRoot,
        foregroundImage,
        width,
        height
      );
      finalAdpativeIconForeground.write(destinationPathAdaptiveIconForeground);

      if (backgroundImage) {
        let finalAdpativeIconBackground = await resizeImageAsync(
          projectRoot,
          backgroundImage,
          width,
          height
        );
        finalAdpativeIconBackground.write(destinationPathAdaptiveIconBackground);
      }
      if (backgroundColor) {
        // TODO: Cruzan
      }
    } catch (e) {
      throw new Error('Encountered an issue resizing adaptive app icon: ' + e);
    }
  }

  // create ic_launcher.xml and ic_launcher_round.xml
  await createAdaptiveIconXmlFiles(projectRoot);
}

async function resizeImageAsync(
  projectRoot: string,
  imagePath: string,
  width: number,
  height: number
) {
  let resizedImage = await generateImageAsync(
    { projectRoot, cacheType: '' },
    { src: imagePath, width, height, resizeMode: 'contain', backgroundColor: '' }
  );
  return await jimp.read(resizedImage.source);
}

async function createAdaptiveIconXmlFiles(projectRoot: string) {
  let anyDpiV26Directory = resolve(projectRoot, ANDROID_RES_PATH, 'mipmap-anydpi-v26');
  await fs.mkdir(anyDpiV26Directory);
  await fs.writeFile(resolve(anyDpiV26Directory, 'ic_launcher.xml'), IC_LAUNCHER_XML_TEMPLATE);
  await fs.writeFile(
    resolve(anyDpiV26Directory, 'ic_launcher_round.xml'),
    IC_LAUNCHER_XML_TEMPLATE
  );
}
