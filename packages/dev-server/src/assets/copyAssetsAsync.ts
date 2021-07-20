import type Log from '@expo/bunyan';
import fs from 'fs';
import type { AssetData } from 'metro';
import path from 'path';

import { getAssetDestPathAndroid, getAssetDestPathIos, PackagerAsset } from './assetPathUtils';

export function getAssetDestinationPath(
  platform: string,
  asset: PackagerAsset,
  scale: number
): string {
  if (platform === 'android') return getAssetDestPathAndroid(asset, scale);
  if (platform === 'ios') return getAssetDestPathIos(asset, scale);
  throw new Error('Cannot get asset destination for unsupported platform: ' + platform);
}

export type BundleAssetWithFileHashes = AssetData & {
  fileHashes: string[]; // added by the hashAssets asset plugin
};

export async function copyFilesAsync(
  logger: Log,
  platform: string,
  filesToCopy: Record<string, string>
) {
  const sources = Object.entries(filesToCopy);
  if (!sources.length) return;
  const plural = sources.length !== 1 ? 's' : '';
  logger.info({ tag: 'metro' }, `Copying ${sources.length} ${platform} asset` + plural);
  while (sources.length) await copyFileAsync(...sources.shift()!);
  //   logger.info({ tag: 'metro' }, `Asset${plural} copied`);
}

async function copyFileAsync(source: string, destination: string): Promise<void> {
  const destDir = path.dirname(destination);
  await fs.promises.mkdir(destDir, { recursive: true });
  return new Promise(resolve => {
    fs.createReadStream(source)
      .pipe(fs.createWriteStream(destination))
      .on('finish', () => resolve());
  });
}
