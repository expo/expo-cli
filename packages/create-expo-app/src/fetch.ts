import fetch from 'node-fetch';
import os from 'os';
import path from 'path';

import { FileSystemCache } from './cache/FileSystemCache';
import { wrapFetchWithCache } from './cache/wrapFetchWithCache';
import { env } from './utils/env';

const debug = require('debug')('create-expo-app:fetch') as typeof console.log;

export function getCacheFilePath(subdir: string = 'template-cache') {
  // TODO: Revisit
  return path.join(os.homedir(), '.create-expo-app', subdir);
}

export function createFetch({
  cacheDirectory,
  ttl,
}: { cacheDirectory?: string; ttl?: number | false } = {}) {
  if (ttl === false || env.EXPO_NO_CACHE) {
    return fetch;
  }
  const directory = getCacheFilePath(cacheDirectory);
  debug('Creating fetch with cache directory:', directory);
  return wrapFetchWithCache(
    fetch,
    new FileSystemCache({
      cacheDirectory: directory,
      ttl,
    })
  );
}
