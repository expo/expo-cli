import fetch from 'node-fetch';
import os from 'os';
import path from 'path';

import { FileSystemCache } from './cache/FileSystemCache';
import { wrapFetchWithCache } from './cache/wrapFetchWithCache';

export function getCacheFilePath(subdir: string = 'template-cache') {
  // TODO: Revisit
  return path.join(os.homedir(), 'create-expo-app', subdir);
}

export function createFetch({
  cacheDirectory,
  ttl,
}: { cacheDirectory?: string; ttl?: number | false } = {}) {
  if (ttl === false) {
    return fetch;
  }
  return wrapFetchWithCache(
    fetch,
    new FileSystemCache({
      cacheDirectory: getCacheFilePath(cacheDirectory),
      ttl,
    })
  );
}
