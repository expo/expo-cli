import path from 'path';
import Jimp from 'jimp';
import fs from 'fs-extra';
import { ExpoConfig } from '../Config.types';
import * as Colors from './Colors';

type DPIString = 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';
type dpiMap = Record<DPIString, { folderName: string; scale: number }>;

const dpiValues: dpiMap = {
  mdpi: { folderName: 'mipmap-mdpi', scale: 1 },
  hdpi: { folderName: 'mipmap-hdpi', scale: 1.5 },
  xhdpi: { folderName: 'mipmap-xhdpi', scale: 2 },
  xxhdpi: { folderName: 'mipmap-xxhdpi', scale: 3 },
  xxxhdpi: { folderName: 'mipmap-xxxhdpi', scale: 4 },
};
const BASELINE_PIXEL_SIZE = 48;
const ANDROID_RES_PATH = 'android/app/src/main/res/';
const ICON_BACKGROUND = 'iconBackground';
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

/**
 * Resizes the user-provided icon to create a set of legacy icon files in
 * their respective "mipmap" directories for <= Android 7, and creates a set of adaptive
 * icon files for > Android 7 from the user-provided adaptive icon (if provided).
 */
export async function setIconAsync(config: ExpoConfig, projectRoot: string) {
  const { foregroundImage, backgroundColor, backgroundImage } = getAdaptiveIcon(config);
  const icon = foregroundImage ?? getIcon(config);

  if (!icon) {
    return null;
  }

  const iconPath = path.resolve(projectRoot, icon);

  // Legacy Icon for Android 7 and earlier
  for (const dpi in dpiValues) {
    const { folderName, scale } = dpiValues[dpi as DPIString];
    let dpiFolderPath = path.resolve(projectRoot, ANDROID_RES_PATH, folderName);
    const length = BASELINE_PIXEL_SIZE * scale;

    try {
      let iconImage = await resizeImageAsync(iconPath, length);
      if (backgroundImage && foregroundImage) {
        // if a background image is supplied, layer the foreground on top of that image.
        let resizedBackgroundImage = await resizeImageAsync(backgroundImage, length);
        iconImage = resizedBackgroundImage.composite(iconImage, 0, 0);
      } else if (backgroundColor && foregroundImage) {
        // if a background color is supplied, layer the foreground on top of that color.
        let resizedBackgroundImage = new Jimp(length, backgroundColor);
        iconImage = resizedBackgroundImage.composite(iconImage, 0, 0);
      }
      await iconImage.write(path.resolve(dpiFolderPath, IC_LAUNCHER_PNG));
      await iconImage.circle().write(path.resolve(dpiFolderPath, IC_LAUNCHER_ROUND_PNG));
    } catch (e) {
      throw new Error('Encountered an issue resizing app icon: ' + e);
    }
  }

  if (!foregroundImage) {
    // If no foreground image, we shouldn't configure the Android Adaptive Icon
    return null;
  }

  // set background color in colors.xml
  await setBackgroundColor(projectRoot, backgroundColor);

  for (const dpi in dpiValues) {
    const { folderName, scale } = dpiValues[dpi as DPIString];
    let dpiFolderPath = path.resolve(projectRoot, ANDROID_RES_PATH, folderName);
    const length = BASELINE_PIXEL_SIZE * scale;

    try {
      let finalAdpativeIconForeground = await resizeImageAsync(foregroundImage, length);
      await finalAdpativeIconForeground.write(
        path.resolve(dpiFolderPath, IC_LAUNCHER_FOREGROUND_PNG)
      );

      if (backgroundImage) {
        let finalAdpativeIconBackground = await resizeImageAsync(backgroundImage, length);
        await finalAdpativeIconBackground.write(
          path.resolve(dpiFolderPath, IC_LAUNCHER_BACKGROUND_PNG)
        );
      }
    } catch (e) {
      throw new Error('Encountered an issue resizing adaptive app icon: ' + e);
    }
  }

  // create ic_launcher.xml and ic_launcher_round.xml
  const icLauncherXmlString = createAdaptiveIconXmlString(
    backgroundImage ? '' : backgroundColor,
    backgroundImage
  );
  await createAdaptiveIconXmlFiles(projectRoot, icLauncherXmlString);
  return true;
}

async function resizeImageAsync(imagePath: string, length: number) {
  return (await Jimp.read(imagePath)).resize(length, length).quality(100);
}

export async function setBackgroundColor(projectDir: string, backgroundColor: string) {
  const colorsXmlPath = await Colors.getProjectColorsXMLPathAsync(projectDir);
  if (!colorsXmlPath) {
    console.warn(
      'Unable to find a colors.xml file in your android project. Background color is not being set.'
    );
    return;
  }
  let colorsJson = await Colors.readColorsXMLAsync(colorsXmlPath);
  const colorItemToAdd = [
    {
      _: backgroundColor,
      $: { name: ICON_BACKGROUND },
    },
  ];
  colorsJson = Colors.setColorItem(colorItemToAdd, colorsJson);
  await Colors.writeColorsXMLAsync(colorsXmlPath, colorsJson);
}

export const createAdaptiveIconXmlString = (
  backgroundColor: string | null,
  backgroundImage: string | null
) => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    ${
      backgroundImage
        ? `<background android:drawable="@mipmap/ic_launcher_background"/>`
        : backgroundColor
        ? `<background android:drawable="@color/iconBackground"/>`
        : null
    }
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;

async function createAdaptiveIconXmlFiles(projectRoot: string, icLauncherXmlString: string) {
  const anyDpiV26Directory = path.resolve(projectRoot, ANDROID_RES_PATH, 'mipmap-anydpi-v26');
  await fs.mkdirp(anyDpiV26Directory);

  await fs.writeFile(path.resolve(anyDpiV26Directory, 'ic_launcher.xml'), icLauncherXmlString);
  await fs.writeFile(
    path.resolve(anyDpiV26Directory, 'ic_launcher_round.xml'),
    icLauncherXmlString
  );
}
