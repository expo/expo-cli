/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'assert';
import path from 'path';

export interface PackagerAsset {
  httpServerLocation: string;
  name: string;
  type: string;
}

const ALLOWED_SCALES: { [key: string]: number[] } = {
  ios: [1, 2, 3],
};

/**
 * FIXME: using number to represent discrete scale numbers is fragile in essence because of
 * floating point numbers imprecision.
 */
export function getAndroidAssetSuffix(scale: number): string {
  switch (scale) {
    case 0.75:
      return 'ldpi';
    case 1:
      return 'mdpi';
    case 1.5:
      return 'hdpi';
    case 2:
      return 'xhdpi';
    case 3:
      return 'xxhdpi';
    case 4:
      return 'xxxhdpi';
    default:
      return '';
  }
}

// See https://developer.android.com/guide/topics/resources/drawable-resource.html
const drawableFileTypes = new Set<string>(['gif', 'jpeg', 'jpg', 'png', 'webp', 'xml']);

export function getAndroidResourceFolderName(asset: PackagerAsset, scale: number): string {
  if (!drawableFileTypes.has(asset.type)) {
    return 'raw';
  }
  const suffix = getAndroidAssetSuffix(scale);
  assert(
    suffix,
    `Don't know which android drawable suffix to use for asset: ${JSON.stringify(asset)}`
  );

  return `drawable-${suffix}`;
}

export function getAndroidResourceIdentifier(asset: PackagerAsset): string {
  const folderPath = getBasePath(asset);
  return `${folderPath}/${asset.name}`
    .toLowerCase()
    .replace(/\//g, '_') // Encode folder structure in file name
    .replace(/([^a-z0-9_])/g, '') // Remove illegal chars
    .replace(/^assets_/, ''); // Remove "assets_" prefix
}

export function getBasePath(asset: PackagerAsset): string {
  const basePath = asset.httpServerLocation;
  if (basePath[0] === '/') {
    return basePath.substr(1);
  }
  return basePath;
}

export function getAssetDestPathIOS(asset: PackagerAsset, scale: number): string {
  const suffix = scale === 1 ? '' : `@${scale}x`;
  const fileName = `${asset.name + suffix}.${asset.type}`;
  return path.join(
    // Assets can have relative paths outside of the project root.
    // Replace `../` with `_` to make sure they don't end up outside of
    // the expected assets directory.
    asset.httpServerLocation.substr(1).replace(/\.\.\//g, '_'),
    fileName
  );
}

export function getAssetDestPathAndroid(asset: PackagerAsset, scale: number): string {
  const androidFolder = getAndroidResourceFolderName(asset, scale);
  const fileName = getAndroidResourceIdentifier(asset);
  return path.join(androidFolder, `${fileName}.${asset.type}`);
}

export function filterPlatformAssetScales(platform: string, scales: number[]): number[] {
  const whitelist: number[] = ALLOWED_SCALES[platform];
  if (!whitelist) {
    return scales;
  }
  const result = scales.filter(scale => whitelist.includes(scale));
  if (result.length === 0 && scales.length > 0) {
    // No matching scale found, but there are some available. Ideally we don't
    // want to be in this situation and should throw, but for now as a fallback
    // let's just use the closest larger image
    const maxScale = whitelist[whitelist.length - 1];
    for (const scale of scales) {
      if (scale > maxScale) {
        result.push(scale);
        break;
      }
    }

    // There is no larger scales available, use the largest we have
    if (result.length === 0) {
      result.push(scales[scales.length - 1]);
    }
  }
  return result;
}
