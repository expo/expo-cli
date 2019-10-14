import fs from 'fs-extra';
import path from 'path';
import url from 'url';

import takeRight from 'lodash/takeRight';
import pMap from 'p-map';
import pRetry from 'p-retry';

import StandaloneContext from './StandaloneContext';
import { saveUrlToPathAsync } from './ExponentTools';

const EXPO_DOMAINS = ['expo.io', 'exp.host', 'expo.test', 'localhost'];
const ASSETS_DIR_DEFAULT_URL = 'https://d1wp6m56sqw74a.cloudfront.net/~assets';

type UrlResolver = (hash: string) => string;

export async function bundleAsync(context: any, assets: string[], dest: string) {
  if (!assets) {
    return;
  }

  await fs.ensureDir(dest);

  const urlResolver = createAssetsUrlResolver(context);
  await pMap(assets, asset => downloadAssetAsync(urlResolver, dest, asset), { concurrency: 5 });
}

async function downloadAssetAsync(urlResolver: UrlResolver, dest: string, asset: string) {
  const extensionIndex = asset.lastIndexOf('.');
  const prefixLength = 'asset_'.length;
  const hash =
    extensionIndex >= 0
      ? asset.substring(prefixLength, extensionIndex)
      : asset.substring(prefixLength);
  await pRetry(() => saveUrlToPathAsync(urlResolver(hash), path.join(dest, asset)), { retries: 3 });
}

function createAssetsUrlResolver(context: StandaloneContext): UrlResolver {
  let assetsDirUrl = ASSETS_DIR_DEFAULT_URL;
  if (context && context.published && context.published.url) {
    const { assetUrlOverride = './assets' } = context.config;
    const publishedUrl = context.published.url;
    const { hostname } = url.parse(publishedUrl);
    if (hostname == null) {
      throw new Error(
        `Could not resolve asset URLs relative to "${publishedUrl}". Published URL must be an absolute URL.`
      );
    }
    const maybeExpoDomain = takeRight(hostname.split('.'), 2).join('.');
    if (!EXPO_DOMAINS.includes(maybeExpoDomain)) {
      assetsDirUrl = url.resolve(publishedUrl, assetUrlOverride);
    }
  }
  return hash => `${assetsDirUrl}/${hash}`;
}
