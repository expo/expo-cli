import type { ExpoAppManifest, HookArguments, PackageJSONConfig } from '@expo/config';
import type { BundleOutput } from '@expo/dev-server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import urljoin from 'url-join';
import { Project, ProjectAssets } from 'xdl';

import Log from '../../log';
import { truncateLastLinesAsync } from '../utils/truncateLastLinesAsync';
import { createMetadataJson } from './createMetadataJson';

export async function writeDebugHtmlAsync({
  projectRoot,
  absoluteOutputDir,
  filenames,
}: {
  projectRoot: string;
  absoluteOutputDir: string;
  filenames: Record<string, string>;
}) {
  // Make a debug html so user can debug their bundles
  Log.log('Preparing additional debugging files');
  const debugHtml = `
      ${Object.values(filenames)
        .map(filename => `<script src="${path.join('bundles', filename)}"></script>`)
        .join('      \n')}
      Open up this file in Chrome. In the Javascript developer console, navigate to the Source tab.
      You can see a red coloured folder containing the original source code from your bundle.
      `;

  await Project.writeArtifactSafelyAsync(
    projectRoot,
    null,
    path.join(absoluteOutputDir, 'debug.html'),
    debugHtml
  );
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
  const filenames: Record<string, string> = {};

  for (const [platform, bundleOutput] of Object.entries(bundles)) {
    const bundle = bundleOutput.hermesBytecodeBundle ?? bundleOutput.code;
    const hash = createBundleHash(bundle);
    const fileName = createBundleFileName({ platform, hash });

    hashes[platform] = hash;
    filenames[platform] = fileName;
    await Project.writeArtifactSafelyAsync(outputDir, null, fileName, bundle);
  }

  return { hashes, filenames };
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
    const mapPath = path.join(outputDir, mapName);
    await fs.promises.writeFile(mapPath, sourceMap);

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
  await fs.promises.writeFile(path.resolve(outputDir, 'metadata.json'), JSON.stringify(metadata));
}

export async function writeAssetMapAsync({
  projectRoot,
  outputDir,
  assets,
}: {
  projectRoot: string;
  outputDir: string;
  assets: ProjectAssets.Asset[];
}) {
  const fileName = path.join(outputDir, 'assetmap.json');

  // Convert the assets array to a k/v pair where the asset hash is the key and the asset is the value.
  const contents = assets.reduce<{ [hash: string]: ProjectAssets.Asset }>((prev, asset) => {
    return {
      ...prev,
      [asset.hash]: asset,
    };
  }, {});

  await Project.writeArtifactSafelyAsync(projectRoot, null, fileName, JSON.stringify(contents));
}

export async function writePlatformManifestsAsync({
  projectRoot,
  outputDir,
  publicUrl,
  filenames,
  exp,
  pkg,
}: {
  projectRoot: string;
  outputDir: string;
  publicUrl: string;
  filenames: Record<string, string>;
  exp: ExpoAppManifest;
  pkg: PackageJSONConfig;
}) {
  const dependencies = Object.keys(pkg.dependencies);
  const manifests: Record<string, any> = {};
  for (const platform of Object.keys(filenames)) {
    // save the platform manifest
    const manifest = {
      ...exp,
      platform,
      bundleUrl: urljoin(publicUrl, 'bundles', filenames[platform]),
      dependencies,
    };
    manifests[platform] = manifest;

    await Project.writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(outputDir, `${platform}-index.json`),
      JSON.stringify(manifest)
    );
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
  manifests: Record<string, any>;
}): MultiPlatformBundleInfo {
  const keys: { key: string; on: (platform: string) => any }[] = [
    {
      key: 'ManifestUrl',
      on: (platform: string) => urljoin(publicUrl, `${platform}-index.json`),
    },
    {
      key: 'Manifest',
      on: platform => manifests[platform]!,
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
