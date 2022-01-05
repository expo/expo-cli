import fs from 'fs-extra';
import pMap from 'p-map';
import pRetry from 'p-retry';
import path from 'path';
import url from 'url';
import urlJoin from 'url-join';

import { AnyStandaloneContext, ExponentTools } from '../internal';

const EXPO_DOMAINS = ['expo.io', 'exp.host', 'expo.test', 'localhost'];
export const DEFAULT_CDN_HOST = 'https://classic-assets.eascdn.net';
export const ASSETS_DIR_DEFAULT_URL = `${DEFAULT_CDN_HOST}/~assets`;

type UrlResolver = (hash: string) => string;

export async function bundleAsync(
  context: any,
  assets: string[],
  dest: string,
  exportUrl?: string | null
) {
  if (!assets) {
    return;
  }

  await fs.ensureDir(dest);

  const urlResolver = createAssetsUrlResolver(context, exportUrl);
  await pMap(assets, asset => downloadAssetAsync(urlResolver, dest, asset), { concurrency: 5 });
}

async function downloadAssetAsync(urlResolver: UrlResolver, dest: string, asset: string) {
  const extensionIndex = asset.lastIndexOf('.');
  const prefixLength = 'asset_'.length;
  const hash =
    extensionIndex >= 0
      ? asset.substring(prefixLength, extensionIndex)
      : asset.substring(prefixLength);
  console.log(urlResolver(hash));
  await pRetry(() => ExponentTools.saveUrlToPathAsync(urlResolver(hash), path.join(dest, asset)), {
    retries: 3,
  });
}

function createAssetsUrlResolver(
  context: AnyStandaloneContext,
  exportUrl?: string | null
): UrlResolver {
  let assetsDirUrl = exportUrl ? `${exportUrl}/assets` : ASSETS_DIR_DEFAULT_URL;

  if (context && context.published && context.published.url) {
    const { assetUrlOverride = './assets' } = context.config;
    const publishedUrl = context.published.url;
    const { hostname } = url.parse(publishedUrl);
    if (hostname == null) {
      throw new Error(
        `Could not resolve asset URLs relative to "${publishedUrl}". Published URL must be an absolute URL.`
      );
    }
    const maybeExpoDomain = hostname.split('.').slice(-2).join('.');
    if (!EXPO_DOMAINS.includes(maybeExpoDomain)) {
      assetsDirUrl = url.resolve(publishedUrl, assetUrlOverride);
    }
  }

  return hash => urlJoin(assetsDirUrl, hash);
}
