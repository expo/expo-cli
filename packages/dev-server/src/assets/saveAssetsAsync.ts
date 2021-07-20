/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type Log from '@expo/bunyan';
import path from 'path';

import { filterPlatformAssetScales } from './assetPathUtils';
import {
  BundleAssetWithFileHashes,
  copyFilesAsync,
  getAssetDestinationPath,
} from './copyAssetsAsync';

export async function saveAssetsAsync({
  logger,
  assets,
  platform,
  assetOutput,
}: {
  logger: Log;
  assets: readonly BundleAssetWithFileHashes[];
  platform: string;
  assetOutput: string;
}) {
  const processedAssets = assets.reduce<Record<string, string>>((prev, asset) => {
    const validScales = new Set(filterPlatformAssetScales(platform, asset.scales));
    asset.scales.forEach((scale, idx) => {
      if (!validScales.has(scale)) return;

      prev[
        // source file
        asset.files[idx]
      ] =
        // output file path
        path.join(assetOutput, getAssetDestinationPath(platform, asset, scale));
    });
    return prev;
  }, {});

  return copyFilesAsync(logger, platform, processedAssets);
}
