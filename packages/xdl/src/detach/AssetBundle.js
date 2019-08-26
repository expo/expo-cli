import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import url from 'url';

import { saveUrlToPathAsync } from './ExponentTools';

const EXPO_DOMAINS = ['expo.io', 'exp.host', 'expo.test', 'localhost'];
const ASSETS_DIR_DEFAULT_URL = 'https://d1wp6m56sqw74a.cloudfront.net/~assets';

export async function bundleAsync(context, assets, dest) {
  if (!assets) {
    return;
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
        await saveUrlToPathAsync(urlResolver(hash), path.join(dest, asset));
      })
    );
  }
}

function createAssetsUrlResolver(context) {
  let assetsDirUrl = ASSETS_DIR_DEFAULT_URL;
  if (context && context.published) {
    const { assetUrlOverride = './assets' } = context.config;
    const publishedUrl = context.published.urls;
    const { hostname } = url.parse(publishedUrl);
    const maybeExpoDomain = _.takeRight(hostname.split('.'), 2).join('.');
    if (!_.includes(EXPO_DOMAINS, maybeExpoDomain)) {
      assetsDirUrl = url.resolve(publishedUrl, assetUrlOverride);
    }
  }
  return hash => `${assetsDirUrl}/${hash}`;
}
