import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

const CACHE_LOCATION = '.expo/web/cache/production/images';
// Calculate SHA256 Checksum value of a file based on its contents
function calculateHash(filePath: string): string {
  const contents = filePath.startsWith('http') ? filePath : fs.readFileSync(filePath);

  return crypto
    .createHash('sha256')
    .update(contents)
    .digest('hex');
}

// Create a hash key for caching the images between builds
export function createCacheKey(icon: Record<string, string>): string {
  const hash = calculateHash(icon.src);
  return [hash, icon.resizeMode, icon.color].filter(Boolean).join('-');
}
export async function createCacheKeyWithDirectoryAsync(
  projectRoot: string,
  type: string,
  icon: Record<string, any>
): Promise<string> {
  const cacheKey = createCacheKey(icon);
  if (!(cacheKey in cacheKeys)) {
    cacheKeys[cacheKey] = await ensureCacheDirectory(projectRoot, type, cacheKey);
  }

  return cacheKey;
}

const cacheKeys: { [key: string]: string } = {};

export async function ensureCacheDirectory(
  projectRoot: string,
  type: string,
  cacheKey: string
): Promise<string> {
  const cacheFolder = path.join(projectRoot, CACHE_LOCATION, type, cacheKey);
  await fs.ensureDir(cacheFolder);
  return cacheFolder;
}

export async function getImageFromCacheAsync(
  fileName: string,
  cacheKey: string
): Promise<null | Buffer> {
  try {
    return await fs.readFile(path.resolve(cacheKeys[cacheKey], fileName));
  } catch (_) {
    return null;
  }
}

export async function cacheImageAsync(
  fileName: string,
  buffer: Buffer,
  cacheKey: string
): Promise<void> {
  try {
    await fs.writeFile(path.resolve(cacheKeys[cacheKey], fileName), buffer);
  } catch ({ message }) {
    console.warn(`error caching image: "${fileName}". ${message}`);
  }
}

export async function clearUnusedCachesAsync(projectRoot: string, type: string): Promise<void> {
  // Clean up any old caches
  const cacheFolder = path.join(projectRoot, CACHE_LOCATION, type);
  await fs.ensureDir(cacheFolder);
  const currentCaches = fs.readdirSync(cacheFolder);

  if (!Array.isArray(currentCaches)) {
    console.warn('Failed to read the icon cache');
    return;
  }
  const deleteCachePromises: Promise<void>[] = [];
  for (const cache of currentCaches) {
    // skip hidden folders
    if (cache.startsWith('.')) {
      continue;
    }

    // delete
    if (!(cache in cacheKeys)) {
      deleteCachePromises.push(fs.remove(path.join(cacheFolder, cache)));
    }
  }

  await Promise.all(deleteCachePromises);
}
