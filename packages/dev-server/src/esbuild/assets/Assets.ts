/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import crypto from 'crypto';
import fs from 'fs';
import imageSize from 'image-size';
import path from 'path';

import { parse, tryParse } from './AssetPaths';

function isAssetTypeAnImage(type: string): boolean {
  return /^(png|jpg|jpeg|bmp|gif|svg|psd|tiff|webp)$/.test(type);
}

export type AssetInfo = {
  files: string[];
  hash: string;
  name: string;
  scales: number[];
  type: string;
};

export type AssetDataWithoutFiles = {
  __packager_asset: boolean;
  fileSystemLocation: string;
  hash: string;
  height?: number;
  httpServerLocation: string;
  name: string;
  scales: number[];
  type: string;
  width?: number;
  [key: string]: any;
};

export type AssetDataFiltered = {
  __packager_asset: boolean;
  hash: string;
  height?: number;
  httpServerLocation: string;
  name: string;
  scales: number[];
  type: string;
  width?: number;
  [key: string]: any;
};

export type AssetData = AssetDataWithoutFiles & { files: string[]; [key: string]: any };

export type AssetDataPlugin = (assetData: AssetData) => AssetData | Promise<AssetData>;

async function hashFiles(files: string[], hash: crypto.Hash) {
  if (!files.length) {
    return;
  }
  const file = files.shift();
  if (file) {
    await fs.promises
      .readFile(file)
      .then(async data => {
        hash.update(data);
        await hashFiles(files, hash);
      })
      .catch(err => {
        console.log(err);
      });
  }
}

function buildAssetMap(dir: string, files: string[], platform: string | null) {
  const platforms = new Set(platform != null ? [platform] : []);
  const assets = files.map(file => tryParse(file, platforms));
  const map = new Map();
  assets.forEach(function (asset, i) {
    if (asset == null) {
      return;
    }
    const file = files[i];
    const assetKey = getAssetKey(asset.assetName, asset.platform);
    let record = map.get(assetKey);
    if (!record) {
      record = {
        scales: [],
        files: [],
      };
      map.set(assetKey, record);
    }

    let insertIndex;
    const length = record.scales.length;

    for (insertIndex = 0; insertIndex < length; insertIndex++) {
      if (asset.resolution < record.scales[insertIndex]) {
        break;
      }
    }
    record.scales.splice(insertIndex, 0, asset.resolution);
    record.files.splice(insertIndex, 0, path.join(dir, file));
  });

  return map;
}

function getAssetKey(assetName: string, platform: string | null) {
  if (platform != null) {
    return `${assetName} : ${platform}`;
  } else {
    return assetName;
  }
}

async function getAbsoluteAssetRecord(assetPath: string, platform: string | null = null) {
  const filename = path.basename(assetPath);
  const dir = path.dirname(assetPath);
  const files = await fs.promises.readdir(dir);

  const assetData = parse(filename, new Set(platform != null ? [platform] : []));

  const map = buildAssetMap(dir, files, platform);

  let record;
  if (platform != null) {
    record = map.get(getAssetKey(assetData.assetName, platform)) || map.get(assetData.assetName);
  } else {
    record = map.get(assetData.assetName);
  }

  if (!record) {
    throw new Error(`Asset not found: ${assetPath} for platform: ${platform}`);
  }

  return record;
}

async function getAbsoluteAssetInfo(assetPath: string, platform: string | null = null) {
  const nameData = parse(assetPath, new Set(platform != null ? [platform] : []));
  const { name, type } = nameData;

  const { scales, files } = await getAbsoluteAssetRecord(assetPath, platform);
  const hasher = crypto.createHash('md5');

  if (files.length > 0) {
    await hashFiles(Array.from(files), hasher);
  }

  return { files, hash: hasher.digest('hex'), name, scales, type };
}

export async function getAssetData(
  assetPath: string,
  localPath: string,
  assetDataPlugins: string[],
  platform: string | null = null,
  publicPath: string
) {
  let assetUrlPath = localPath.startsWith('..')
    ? publicPath.replace(/\/$/, '') + '/' + path.dirname(localPath)
    : path.join(publicPath, path.dirname(localPath));

  if (path.sep === '\\') {
    assetUrlPath = assetUrlPath.replace(/\\/g, '/');
  }

  const isImage = isAssetTypeAnImage(path.extname(assetPath).slice(1));
  const assetInfo = await getAbsoluteAssetInfo(assetPath, platform);

  const isImageInput = assetInfo.files[0].includes('.zip/')
    ? fs.readFileSync(assetInfo.files[0])
    : assetInfo.files[0];

  const dimensions = isImage ? imageSize(isImageInput) : null;

  const scale = assetInfo.scales[0];

  const assetData = {
    __packager_asset: true,
    fileSystemLocation: path.dirname(assetPath),
    httpServerLocation: assetUrlPath,
    width: dimensions?.width ? dimensions.width / scale : undefined,
    height: dimensions?.height ? dimensions.height / scale : undefined,
    scales: assetInfo.scales,
    files: assetInfo.files,
    hash: assetInfo.hash,
    name: assetInfo.name,
    type: assetInfo.type,
  };
  return await applyAssetDataPlugins(assetDataPlugins, assetData);
}

async function applyAssetDataPlugins(
  assetDataPlugins: string[],
  assetData: AssetData
): Promise<AssetData> {
  if (!assetDataPlugins.length) {
    return assetData;
  }

  const [currentAssetPlugin, ...remainingAssetPlugins] = assetDataPlugins;
  let assetPluginFunction = require(currentAssetPlugin);
  if (typeof assetPluginFunction !== 'function') {
    assetPluginFunction = assetPluginFunction.default;
  }
  const resultAssetData = await assetPluginFunction(assetData);
  return await applyAssetDataPlugins(remainingAssetPlugins, resultAssetData);
}

export async function getAssetFiles(assetPath: string, platform: string | null = null) {
  const assetData = await getAbsoluteAssetRecord(assetPath, platform);
  return assetData.files;
}

export async function getAsset(
  relativePath: string,
  projectRoot: string,
  watchFolders: string[],
  platform: string | null = null,
  assetExts?: string[]
) {
  const assetData = parse(relativePath, new Set(platform != null ? [platform] : []));

  const absolutePath = path.resolve(projectRoot, relativePath);

  if (!assetExts?.includes(assetData.type)) {
    throw new Error(
      `'${relativePath}' cannot be loaded as its extension is not registered in assetExts`
    );
  }

  if (!pathBelongsToRoots(absolutePath, [projectRoot, ...watchFolders])) {
    throw new Error(
      `'${relativePath}' could not be found, because it cannot be found in the project root or any watch folder`
    );
  }

  const record = await getAbsoluteAssetRecord(absolutePath, platform);

  for (let i = 0; i < record.scales.length; i++) {
    if (record.scales[i] >= assetData.resolution) {
      return fs.promises.readFile(record.files[i]);
    }
  }

  return fs.promises.readFile(record.files[record.files.length - 1]);
}

function pathBelongsToRoots(pathToCheck: string, roots: string[]) {
  for (const rootFolder of roots) {
    if (pathToCheck.startsWith(path.resolve(rootFolder))) {
      return true;
    }
  }

  return false;
}
