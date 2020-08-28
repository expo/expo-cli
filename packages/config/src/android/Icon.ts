import { generateImageAsync, layerImageAsync } from '@expo/image-utils';
import fs from 'fs-extra';
import path from 'path';

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
const MIPMAP_ANYDPI_V26 = 'mipmap-anydpi-v26';
const ICON_BACKGROUND = 'iconBackground';
const IC_LAUNCHER_PNG = 'ic_launcher.png';
const IC_LAUNCHER_ROUND_PNG = 'ic_launcher_round.png';
const IC_LAUNCHER_BACKGROUND_PNG = 'ic_launcher_background.png';
const IC_LAUNCHER_FOREGROUND_PNG = 'ic_launcher_foreground.png';
const IC_LAUNCHER_XML = 'ic_launcher.xml';
const IC_LAUNCHER_ROUND_XML = 'ic_launcher_round.xml';

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
 * icon files for > Android 7 from the adaptive icon files (if provided).
 */
export async function setIconAsync(config: ExpoConfig, projectRoot: string) {
  const { foregroundImage, backgroundColor, backgroundImage } = getAdaptiveIcon(config);
  const icon = foregroundImage ?? getIcon(config);

  if (!icon) {
    return null;
  }

  await configureLegacyIconAsync(projectRoot, icon, backgroundImage, backgroundColor);

  await configureAdaptiveIconAsync(projectRoot, icon, backgroundImage, backgroundColor);

  return true;
}

/**
 * Configures legacy icon files to be used on Android 7 and earlier. If adaptive icon configuration
 * was provided, we create a pseudo-adaptive icon by layering the provided files (or background
 * color if no backgroundImage is provided. If no backgroundImage and no backgroundColor are provided,
 * the background is set to transparent.)
 */
async function configureLegacyIconAsync(
  projectRoot: string,
  icon: string,
  backgroundImage: string | null,
  backgroundColor: string | null
) {
  Promise.all(
    Object.values(dpiValues).map(async ({ folderName, scale }) => {
      const dpiFolderPath = path.resolve(projectRoot, ANDROID_RES_PATH, folderName);
      const iconSizePx = BASELINE_PIXEL_SIZE * scale;

      try {
        let squareIconImage: Buffer = (
          await generateImageAsync(
            { projectRoot, cacheType: 'android-standard-square' },
            {
              src: icon,
              width: iconSizePx,
              height: iconSizePx,
              resizeMode: 'cover',
              backgroundColor: backgroundColor ?? 'transparent',
            }
          )
        ).source;
        let roundIconImage: Buffer = (
          await generateImageAsync(
            { projectRoot, cacheType: 'android-standard-circle' },
            {
              src: icon,
              width: iconSizePx,
              height: iconSizePx,
              resizeMode: 'cover',
              backgroundColor: backgroundColor ?? 'transparent',
              circle: true,
            }
          )
        ).source;

        if (backgroundImage) {
          // Layer the buffers we just created on top of the background image that's provided
          const squareBackgroundLayer = (
            await generateImageAsync(
              { projectRoot, cacheType: 'android-standard-square-background' },
              {
                src: backgroundImage,
                width: iconSizePx,
                height: iconSizePx,
                resizeMode: 'cover',
                backgroundColor: backgroundColor ?? 'transparent',
              }
            )
          ).source;
          const roundBackgroundLayer = (
            await generateImageAsync(
              { projectRoot, cacheType: 'android-standard-round-background' },
              {
                src: backgroundImage,
                width: iconSizePx,
                height: iconSizePx,
                resizeMode: 'cover',
                backgroundColor: backgroundColor ?? 'transparent',
                circle: true,
              }
            )
          ).source;
          squareIconImage = await layerImageAsync(squareIconImage, squareBackgroundLayer);
          roundIconImage = await layerImageAsync(roundIconImage, roundBackgroundLayer);
        }

        await fs.mkdirp(dpiFolderPath);
        await fs.writeFile(path.resolve(dpiFolderPath, IC_LAUNCHER_PNG), squareIconImage);
        await fs.writeFile(path.resolve(dpiFolderPath, IC_LAUNCHER_ROUND_PNG), roundIconImage);
      } catch (e) {
        throw new Error('Encountered an issue resizing app icon: ' + e);
      }
    })
  );
}

/**
 * Configures adaptive icon files to be used on Android 8 and up. A foreground image must be provided,
 * and will have a transparent background unless:
 * - A backgroundImage is provided, or
 * - A backgroundColor was specified
 */
export async function configureAdaptiveIconAsync(
  projectRoot: string,
  foregroundImage: string,
  backgroundImage: string | null,
  backgroundColor: string | null
) {
  if (backgroundColor) {
    await setBackgroundColorAsync(projectRoot, backgroundColor);
  }

  Promise.all(
    Object.values(dpiValues).map(async ({ folderName, scale }) => {
      const dpiFolderPath = path.resolve(projectRoot, ANDROID_RES_PATH, folderName);
      const iconSizePx = BASELINE_PIXEL_SIZE * scale;

      try {
        const adpativeIconForeground = (
          await generateImageAsync(
            { projectRoot, cacheType: 'android-adaptive-foreground' },
            {
              src: foregroundImage,
              width: iconSizePx,
              height: iconSizePx,
              resizeMode: 'cover',
              backgroundColor: 'transparent',
            }
          )
        ).source;
        await fs.writeFile(
          path.resolve(dpiFolderPath, IC_LAUNCHER_FOREGROUND_PNG),
          adpativeIconForeground
        );

        if (backgroundImage) {
          const adpativeIconBackground = (
            await generateImageAsync(
              { projectRoot, cacheType: 'android-adaptive-background' },
              {
                src: backgroundImage,
                width: iconSizePx,
                height: iconSizePx,
                resizeMode: 'cover',
                backgroundColor: 'transparent',
              }
            )
          ).source;
          await fs.writeFile(
            path.resolve(dpiFolderPath, IC_LAUNCHER_BACKGROUND_PNG),
            adpativeIconBackground
          );
        } else {
          // Remove any instances of ic_launcher_background.png that are there from previous icons
          await removeBackgroundImageFilesAsync(projectRoot);
        }
      } catch (e) {
        throw new Error('Encountered an issue resizing adaptive app icon: ' + e);
      }
    })
  );

  // create ic_launcher.xml and ic_launcher_round.xml
  const icLauncherXmlString = createAdaptiveIconXmlString(
    backgroundImage ? '' : backgroundColor,
    backgroundImage
  );
  await createAdaptiveIconXmlFiles(projectRoot, icLauncherXmlString);
}

async function setBackgroundColorAsync(projectRoot: string, backgroundColor: string) {
  const colorsXmlPath = await Colors.getProjectColorsXMLPathAsync(projectRoot);
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
  const anyDpiV26Directory = path.resolve(projectRoot, ANDROID_RES_PATH, MIPMAP_ANYDPI_V26);
  await fs.mkdirp(anyDpiV26Directory);
  await fs.writeFile(path.resolve(anyDpiV26Directory, IC_LAUNCHER_XML), icLauncherXmlString);
  await fs.writeFile(path.resolve(anyDpiV26Directory, IC_LAUNCHER_ROUND_XML), icLauncherXmlString);
}

async function removeBackgroundImageFilesAsync(projectRoot: string) {
  Promise.all(
    Object.values(dpiValues).map(async ({ folderName, scale }) => {
      const dpiFolderPath = path.resolve(projectRoot, ANDROID_RES_PATH, folderName);
      await fs.remove(path.resolve(dpiFolderPath, IC_LAUNCHER_BACKGROUND_PNG));
    })
  );
}
