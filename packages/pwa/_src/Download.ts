import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';
import stream from 'stream';
import temporary from 'tempy';
import util from 'util';

// cache downloaded images into memory
const cacheDownloadedKeys: Record<string, string> = {};

function stripQueryParams(url: string): string {
  return url.split('?')[0].split('#')[0];
}

export async function downloadOrUseCachedImage(url: string): Promise<string> {
  if (url in cacheDownloadedKeys) {
    return cacheDownloadedKeys[url];
  }
  if (url.startsWith('http')) {
    cacheDownloadedKeys[url] = await downloadImage(url);
  } else {
    cacheDownloadedKeys[url] = url;
  }
  return cacheDownloadedKeys[url];
}

export async function downloadImage(url: string): Promise<string> {
  const outputPath = temporary.directory();
  const localPath = path.join(outputPath, path.basename(stripQueryParams(url)));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`It was not possible to download image from '${url}'`);
  }

  // Download to local file
  const streamPipeline = util.promisify(stream.pipeline);
  await streamPipeline(response.body, fs.createWriteStream(localPath));

  return localPath;
}
