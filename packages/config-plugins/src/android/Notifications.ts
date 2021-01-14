import { ExpoConfig } from '@expo/config-types';
import { generateImageAsync } from '@expo/image-utils';
import fs from 'fs-extra';
import path from 'path';

import { ConfigPlugin } from '../Plugin.types';
import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import { withDangerousMod } from '../plugins/core-plugins';
import { writeXMLAsync } from '../utils/XML';
import * as Colors from './Colors';
import { ANDROID_RES_PATH, dpiValues } from './Icon';
import {
  addMetaDataItemToMainApplication,
  AndroidManifest,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} from './Manifest';
import { buildResourceItem, readResourcesXMLAsync } from './Resources';

const BASELINE_PIXEL_SIZE = 24;
export const META_DATA_NOTIFICATION_ICON = 'expo.modules.notifications.default_notification_icon';
export const META_DATA_NOTIFICATION_ICON_COLOR =
  'expo.modules.notifications.default_notification_color';
export const NOTIFICATION_ICON = 'notification_icon';
export const NOTIFICATION_ICON_RESOURCE = `@drawable/${NOTIFICATION_ICON}`;
export const NOTIFICATION_ICON_COLOR = 'notification_icon_color';
export const NOTIFICATION_ICON_COLOR_RESOURCE = `@color/${NOTIFICATION_ICON_COLOR}`;

export const withNotificationIcons: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      await setNotificationIconAsync(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export const withNotificationIconColor: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      await setNotificationIconColorAsync(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export const withNotificationManifest = createAndroidManifestPlugin(
  setNotificationConfigAsync,
  'withNotificationManifest'
);

export function getNotificationIcon(config: ExpoConfig) {
  return config.notification?.icon || null;
}

export function getNotificationColor(config: ExpoConfig) {
  return config.notification?.color || null;
}

/**
 * Applies configuration for expo-notifications, including
 * the notification icon and notification color.
 */
export async function setNotificationIconAsync(config: ExpoConfig, projectRoot: string) {
  const icon = getNotificationIcon(config);
  if (icon) {
    await writeNotificationIconImageFilesAsync(icon, projectRoot);
  } else {
    await removeNotificationIconImageFilesAsync(projectRoot);
  }
}

export async function setNotificationConfigAsync(config: ExpoConfig, manifest: AndroidManifest) {
  const icon = getNotificationIcon(config);
  const color = getNotificationColor(config);
  const mainApplication = getMainApplicationOrThrow(manifest);
  if (icon) {
    addMetaDataItemToMainApplication(
      mainApplication,
      META_DATA_NOTIFICATION_ICON,
      NOTIFICATION_ICON_RESOURCE,
      'resource'
    );
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, META_DATA_NOTIFICATION_ICON);
  }
  if (color) {
    addMetaDataItemToMainApplication(
      mainApplication,
      META_DATA_NOTIFICATION_ICON_COLOR,
      NOTIFICATION_ICON_COLOR_RESOURCE,
      'resource'
    );
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, META_DATA_NOTIFICATION_ICON_COLOR);
  }
  return manifest;
}

export async function setNotificationIconColorAsync(config: ExpoConfig, projectRoot: string) {
  const color = getNotificationColor(config);
  const colorsXmlPath = await Colors.getProjectColorsXMLPathAsync(projectRoot);
  let colorsJson = await readResourcesXMLAsync({ path: colorsXmlPath });
  if (color) {
    const colorItemToAdd = buildResourceItem({ name: NOTIFICATION_ICON_COLOR, value: color });
    colorsJson = Colors.setColorItem(colorItemToAdd, colorsJson);
  } else {
    colorsJson = Colors.removeColorItem(NOTIFICATION_ICON_COLOR, colorsJson);
  }
  await writeXMLAsync({ path: colorsXmlPath, xml: colorsJson });
}

async function writeNotificationIconImageFilesAsync(icon: string, projectRoot: string) {
  await Promise.all(
    Object.values(dpiValues).map(async ({ folderName, scale }) => {
      const drawableFolderName = folderName.replace('mipmap', 'drawable');
      const dpiFolderPath = path.resolve(projectRoot, ANDROID_RES_PATH, drawableFolderName);
      await fs.ensureDir(dpiFolderPath);
      const iconSizePx = BASELINE_PIXEL_SIZE * scale;

      try {
        const resizedIcon = (
          await generateImageAsync(
            { projectRoot, cacheType: 'android-notification' },
            {
              src: icon,
              width: iconSizePx,
              height: iconSizePx,
              resizeMode: 'cover',
              backgroundColor: 'transparent',
            }
          )
        ).source;
        await fs.writeFile(path.resolve(dpiFolderPath, NOTIFICATION_ICON + '.png'), resizedIcon);
      } catch (e) {
        throw new Error('Encountered an issue resizing Android notification icon: ' + e);
      }
    })
  );
}

async function removeNotificationIconImageFilesAsync(projectRoot: string) {
  await Promise.all(
    Object.values(dpiValues).map(async ({ folderName }) => {
      const drawableFolderName = folderName.replace('mipmap', 'drawable');
      const dpiFolderPath = path.resolve(projectRoot, ANDROID_RES_PATH, drawableFolderName);
      await fs.remove(path.resolve(dpiFolderPath, NOTIFICATION_ICON + '.png'));
    })
  );
}
