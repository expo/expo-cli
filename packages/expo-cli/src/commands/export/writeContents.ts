import type { ExpoAppManifest, HookArguments, PackageJSONConfig } from '@expo/config';
import type { BundleOutput } from '@expo/dev-server';
import crypto from 'crypto';
import fs from 'fs';
import { ensureDir } from 'fs-extra';
import path from 'path';
import urljoin from 'url-join';
import { ProjectAssets } from 'xdl';

import Log from '../../log';
import { truncateLastLinesAsync } from '../utils/truncateLastLinesAsync';
import { createMetadataJson } from './createMetadataJson';

type PlatformExpoAppManifest = ExpoAppManifest & {
  platform: string;
  bundleUrl: string;
  dependencies: string[];
};

async function writeAsync(folder: string, fileName: string, contents: any) {
  await ensureDir(folder);
  await fs.promises.writeFile(path.join(folder, fileName), contents);
}

export async function writeDebugHtmlAsync({
  outputDir,
  fileNames,
}: {
  outputDir: string;
  fileNames: Record<string, string>;
}) {
  // Make a debug html so user can debug their bundles
  Log.log('Preparing additional debugging files');
  const debugHtml = `
      ${Object.values(fileNames)
        .map(fileName => `<script src="${path.join('bundles', fileName)}"></script>`)
        .join('\n      ')}
      Open up this file in Chrome. In the Javascript developer console, navigate to the Source tab.
      You can see a red coloured folder containing the original source code from your bundle.
      `;

  await writeAsync(outputDir, 'debug.html', debugHtml);
}

/**
 * @param props.platform native platform for the bundle
 * @param props.hash crypto hash for the bundle contents
 * @returns filename for the JS bundle.
 */
function createBundleFileName({ platform, hash }: { platform: string; hash: string }): string {
  return `${platform}-${hash}.js`;
}

/**
 * @param bundle JS bundle as a string
 * @returns crypto hash for the provided bundle
 */
function createBundleHash(bundle: string | Uint8Array): string {
  return crypto.createHash('md5').update(bundle).digest('hex');
}

export async function writeBundlesAsync({
  bundles,
  outputDir,
}: {
  bundles: Record<string, BundleOutput>;
  outputDir: string;
}) {
  const hashes: Record<string, string> = {};
  const fileNames: Record<string, string> = {};

  for (const [platform, bundleOutput] of Object.entries(bundles)) {
    const bundle = bundleOutput.hermesBytecodeBundle ?? bundleOutput.code;
    const hash = createBundleHash(bundle);
    const fileName = createBundleFileName({ platform, hash });

    hashes[platform] = hash;
    fileNames[platform] = fileName;
    await writeAsync(outputDir, fileName, bundle);
  }

  return { hashes, fileNames };
}

export async function writeSourceMapsAsync({
  bundles,
  hashes,
  fileNames,
  outputDir,
  removeOriginalSourceMappingUrl,
}: {
  bundles: Record<string, BundleOutput>;
  hashes?: Record<string, string>;
  fileNames?: Record<string, string>;
  outputDir: string;
  removeOriginalSourceMappingUrl?: boolean;
}) {
  for (const [platform, bundle] of Object.entries(bundles)) {
    const sourceMap = bundle.hermesSourcemap ?? bundle.map;
    const hash = hashes?.[platform] ?? createBundleHash(bundle.hermesBytecodeBundle ?? bundle.code);
    const mapName = `${platform}-${hash}.map`;
    await writeAsync(outputDir, mapName, sourceMap);

    const jsBundleFileName = fileNames?.[platform] ?? createBundleFileName({ platform, hash });
    const jsPath = path.join(outputDir, jsBundleFileName);

    if (removeOriginalSourceMappingUrl) {
      // Remove original mapping to incorrect sourcemap paths
      // In SDK 40+ and bare projects, we no longer need to do this.
      Log.log(`Configuring source maps for ${platform}`);
      await truncateLastLinesAsync(jsPath, 1);
    }

    // Add correct mapping to sourcemap paths
    const mappingComment = `\n//# sourceMappingURL=${mapName}`;
    await fs.promises.appendFile(jsPath, mappingComment);
  }
}

export async function writeMetadataJsonAsync({
  outputDir,
  bundles,
  fileNames,
}: {
  outputDir: string;
  bundles: Record<string, BundleOutput>;
  fileNames: Record<string, string>;
}) {
  const metadata = await createMetadataJson({
    bundles,
    filenames: fileNames,
  });
  await writeAsync(outputDir, 'metadata.json', JSON.stringify(metadata));
}

export async function writeAssetMapAsync({
  outputDir,
  assets,
}: {
  outputDir: string;
  assets: ProjectAssets.Asset[];
}) {
  // Convert the assets array to a k/v pair where the asset hash is the key and the asset is the value.
  const contents = assets.reduce<{ [hash: string]: ProjectAssets.Asset }>((prev, asset) => {
    return {
      ...prev,
      [asset.hash]: asset,
    };
  }, {});

  await writeAsync(outputDir, 'assetmap.json', JSON.stringify(contents));
}

export async function writePlatformManifestsAsync({
  outputDir,
  publicUrl,
  fileNames,
  exp,
  pkg,
}: {
  outputDir: string;
  publicUrl: string;
  fileNames: Record<string, string>;
  exp: ExpoAppManifest;
  pkg: PackageJSONConfig;
}): Promise<Record<string, PlatformExpoAppManifest>> {
  const dependencies = Object.keys(pkg.dependencies);
  const manifests: Record<string, PlatformExpoAppManifest> = {};
  for (const platform of Object.keys(fileNames)) {
    // save the platform manifest
    const manifest: PlatformExpoAppManifest = {
      ...exp,
      platform,
      bundleUrl: urljoin(publicUrl, 'bundles', fileNames[platform]),
      dependencies,
    };
    manifests[platform] = manifest;
    await writeAsync(outputDir, `${platform}-index.json`, JSON.stringify(manifest));
  }
  return manifests;
}

// TODO: Refactor this to support more/less platforms better.
export type MultiPlatformBundleInfo = Pick<
  HookArguments,
  | 'androidManifestUrl'
  | 'androidBundle'
  | 'androidManifest'
  | 'androidSourceMap'
  | 'iosManifestUrl'
  | 'iosBundle'
  | 'iosManifest'
  | 'iosSourceMap'
>;

export function createMultiPlatformBundleInfo({
  publicUrl,
  bundles,
  manifests,
}: {
  publicUrl: string;
  bundles: Record<string, BundleOutput>;
  manifests: Record<string, PlatformExpoAppManifest>;
}): MultiPlatformBundleInfo {
  const keys: { key: string; on: (platform: string) => any }[] = [
    {
      key: 'ManifestUrl',
      on: (platform: string) => urljoin(publicUrl, `${platform}-index.json`),
    },
    {
      key: 'Manifest',
      on: platform => manifests[platform] ?? null,
    },
    {
      key: 'Bundle',
      on: platform => bundles[platform].hermesBytecodeBundle ?? bundles[platform].code,
    },
    {
      key: 'SourceMap',
      on: platform => bundles[platform].hermesSourcemap ?? bundles[platform].map,
    },
  ];

  return keys.reduce((prev, cur) => {
    for (const platform of Object.keys(bundles)) {
      // Like `iosManifestUrl`, or `androidBundle`
      const configKey = platform + cur.key;
      // @ts-ignore: needs refactor in the future -- currently a refactor would break the public API for publish hooks.
      prev[configKey] = cur.on(platform);
    }
    return prev;
  }, {} as MultiPlatformBundleInfo);
}
