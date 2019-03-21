// Copyright 2015-present 650 Industries. All rights reserved.
/**
 * @flow
 */

import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import url from 'url';

import { saveUrlToPathAsync } from './ExponentTools';
import StandaloneContext from './StandaloneContext';

const EXPO_DOMAINS = ['expo.io', 'exp.host', 'expo.test', 'localhost'];
const ASSETS_DIR_DEFAULT_URL = 'https://d1wp6m56sqw74a.cloudfront.net/~assets';

export async function bundleAsync(
  context: StandaloneContext,
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

  const urlResolver = createAssetsUrlResolver(context);

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
          urlResolver(hash),
          // For sdk24 the runtime expects only the hash as the filename.
          path.join(dest, oldFormat ? hash : asset)
        );
      })
    );
  }
}

function createAssetsUrlResolver(context) {
  let assetsDirUrl = ASSETS_DIR_DEFAULT_URL;
  if (context) {
    const { assetUrlOverride = './assets' } = context.config;
    const publishedUrl = context.published.url;
    const { hostname } = url.parse(publishedUrl);
    const maybeExpoDomain = _.takeRight(hostname.split('.'), 2).join('.');
    if (!_.includes(EXPO_DOMAINS, maybeExpoDomain)) {
      assetsDirUrl = url.resolve(publishedUrl, assetUrlOverride);
    }
  }
  return hash => `${assetsDirUrl}/${hash}`;
}
