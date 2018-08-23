// Copyright 2015-present 650 Industries. All rights reserved.
/**
 * @flow
 */

import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';

import { saveUrlToPathAsync } from './ExponentTools';

export async function bundleAsync(
  assets: ?(Array<string> | Array<Object>),
  dest: string,
  oldFormat: boolean = false
): Promise<void> {
  if (!assets) {
    return;
  }
  // Compat with exp 46.x.x, can remove when this version is phasing out.
  if (typeof assets[0] === 'object') {
    assets = assets.reduce(
      (res, cur) =>
        res.concat(cur.fileHashes.map(h => 'asset_' + h + (cur.type ? '.' + cur.type : ''))),
      []
    );
  }

  await fs.ensureDir(dest);

  const batches = _.chunk(assets, 5);
  for (const batch of batches) {
    await Promise.all(
      batch.map(async asset => {
        const extensionIndex = asset.lastIndexOf('.');
        const prefixLength = 'asset_'.length;
        const hash =
          extensionIndex >= 0
            ? asset.substring(prefixLength, extensionIndex)
            : asset.substring(prefixLength);
        await saveUrlToPathAsync(
          'https://d1wp6m56sqw74a.cloudfront.net/~assets/' + hash,
          // For sdk24 the runtime expects only the hash as the filename.
          path.join(dest, oldFormat ? hash : asset)
        );
      })
    );
  }
}
