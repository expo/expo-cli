import { ExpoAppManifest, ExpoConfig } from '@expo/config';
import { BundleAssetWithFileHashes, BundleOutput } from '@expo/dev-server';
import assert from 'assert';
import crypto from 'crypto';
import FormData from 'form-data';
import fs from 'fs-extra';
import chunk from 'lodash/chunk';
import get from 'lodash/get';
import set from 'lodash/set';
import uniqBy from 'lodash/uniqBy';
import md5hex from 'md5hex';
import mime from 'mime';
import minimatch from 'minimatch';
import path from 'path';
import urljoin from 'url-join';

import { ApiV2, ExpSchema, Logger as logger, ProjectUtils, UserManager } from './internal';

const EXPO_CDN = 'https://d1wp6m56sqw74a.cloudfront.net';

type ManifestAsset = { fileHashes: string[]; files: string[]; hash: string };

export type Asset = ManifestAsset | BundleAssetWithFileHashes;

type ManifestResolutionError = Error & {
  localAssetPath?: string;
  manifestField?: string;
};

type BundlesByPlatform = { android?: BundleOutput; ios?: BundleOutput };

type ExportAssetsOptions = {
  projectRoot: string;
  exp: ExpoAppManifest;
  hostedUrl: string;
  assetPath: string;
  bundles: BundlesByPlatform;
  outputDir?: string;
  experimentalBundle?: boolean;
};

export async function resolveGoogleServicesFile(projectRoot: string, manifest: ExpoConfig) {
  if (manifest.android?.googleServicesFile) {
    const contents = await fs.readFile(
      path.resolve(projectRoot, manifest.android.googleServicesFile),
      'utf8'
    );
    manifest.android.googleServicesFile = contents;
  }
  if (manifest.ios?.googleServicesFile) {
    const contents = await fs.readFile(
      path.resolve(projectRoot, manifest.ios.googleServicesFile),
      'base64'
    );
    manifest.ios.googleServicesFile = contents;
  }
}

/**
 * Get all fields in the manifest that match assets, then filter the ones that aren't set.
 *
 * @param manifest
 * @returns Asset fields that the user has set like ["icon", "splash.image", ...]
 */
async function getAssetFieldPathsForManifestAsync(manifest: ExpoConfig): Promise<string[]> {
  // String array like ["icon", "notification.icon", "loading.icon", "loading.backgroundImage", "ios.icon", ...]
  const sdkAssetFieldPaths = await ExpSchema.getAssetSchemasAsync(manifest.sdkVersion);
  return sdkAssetFieldPaths.filter(assetSchema => get(manifest, assetSchema));
}

async function resolveExpoUpdatesManifestAssets({
  projectRoot,
  manifest,
  assetKeyResolver,
}: {
  projectRoot: string;
  manifest: ExpoConfig;
  assetKeyResolver: (assetPath: string) => Promise<string>;
}): Promise<void> {
  const assetSchemas = await getAssetFieldPathsForManifestAsync(manifest);
  // Get the URLs
  const assetInfos = await Promise.all(
    assetSchemas.map(async manifestField => {
      const pathOrURL = get(manifest, manifestField);
      if (/^https?:\/\//.test(pathOrURL)) {
        // It's a remote URL
        return {
          assetKey: null,
          rawUrl: pathOrURL,
        };
      } else if (fs.existsSync(path.resolve(projectRoot, pathOrURL))) {
        const assetKey = await assetKeyResolver(pathOrURL);
        return {
          assetKey,
          rawUrl: null,
        };
      } else {
        ProjectUtils.logError(
          projectRoot,
          'expo',
          `Unable to resolve asset "${pathOrURL}" from "${manifestField}" in your app.json or app.config.js`
        );
        const err: ManifestResolutionError = new Error('Could not resolve local asset.');
        err.localAssetPath = pathOrURL;
        err.manifestField = manifestField;
        throw err;
      }
    })
  );

  assetSchemas.forEach((manifestField, index: number) =>
    set(manifest, `${manifestField}Asset`, assetInfos[index])
  );
}

export async function resolveManifestAssets({
  projectRoot,
  manifest,
  resolver,
  strict = false,
}: {
  projectRoot: string;
  manifest: ExpoConfig;
  resolver: (assetPath: string) => Promise<string>;
  strict?: boolean;
}) {
  try {
    // Asset fields that the user has set like ["icon", "splash.image"]
    const assetSchemas = await getAssetFieldPathsForManifestAsync(manifest);
    // Get the URLs
    const urls = await Promise.all(
      assetSchemas.map(async manifestField => {
        const pathOrURL = get(manifest, manifestField);
        if (/^https?:\/\//.test(pathOrURL)) {
          // It's a remote URL
          return pathOrURL;
        } else if (fs.existsSync(path.resolve(projectRoot, pathOrURL))) {
          return await resolver(pathOrURL);
        } else {
          const err: ManifestResolutionError = new Error('Could not resolve local asset.');
          err.localAssetPath = pathOrURL;
          err.manifestField = manifestField;
          throw err;
        }
      })
    );

    // Set the corresponding URL fields
    assetSchemas.forEach((manifestField, index: number) =>
      set(manifest, `${manifestField}Url`, urls[index])
    );
  } catch (e) {
    let logMethod = ProjectUtils.logWarning;
    if (strict) {
      logMethod = ProjectUtils.logError;
    }
    if (e.localAssetPath) {
      logMethod(
        projectRoot,
        'expo',
        `Unable to resolve asset "${e.localAssetPath}" from "${e.manifestField}" in your app.json or app.config.js`
      );
    } else {
      logMethod(
        projectRoot,
        'expo',
        `Warning: Unable to resolve manifest assets. Icons might not work. ${e.message}.`
      );
    }

    if (strict) {
      throw new Error('Resolving assets failed.');
    }
  }
}

/**
 * Configures exp, preparing it for asset export
 *
 * @modifies {exp}
 *
 */
async function _configureExpForAssets(projectRoot: string, exp: ExpoAppManifest, assets: Asset[]) {
  // Add google services file if it exists
  await resolveGoogleServicesFile(projectRoot, exp);

  // Convert asset patterns to a list of asset strings that match them.
  // Assets strings are formatted as `asset_<hash>.<type>` and represent
  // the name that the file will have in the app bundle. The `asset_` prefix is
  // needed because android doesn't support assets that start with numbers.
  if (exp.assetBundlePatterns) {
    const fullPatterns: string[] = exp.assetBundlePatterns.map((p: string) =>
      path.join(projectRoot, p)
    );
    // Only log the patterns in debug mode, if they aren't already defined in the app.json, then all files will be targeted.
    logger.global.info('\nProcessing asset bundle patterns:');
    fullPatterns.forEach(p => logger.global.info('- ' + p));

    // The assets returned by the RN packager has duplicates so make sure we
    // only bundle each once.
    const bundledAssets = new Set<string>();
    for (const asset of assets) {
      const file = asset.files && asset.files[0];
      const shouldBundle =
        '__packager_asset' in asset &&
        asset.__packager_asset &&
        file &&
        fullPatterns.some((p: string) => minimatch(file, p));
      ProjectUtils.logDebug(
        projectRoot,
        'expo',
        `${shouldBundle ? 'Include' : 'Exclude'} asset ${file}`
      );
      if (shouldBundle) {
        asset.fileHashes.forEach(hash =>
          bundledAssets.add(
            'asset_' + hash + ('type' in asset && asset.type ? '.' + asset.type : '')
          )
        );
      }
    }
    exp.bundledAssets = [...bundledAssets];
    delete exp.assetBundlePatterns;
  }

  return exp;
}

export async function publishAssetsAsync(
  options: Pick<ExportAssetsOptions, 'projectRoot' | 'exp' | 'bundles'>
) {
  return exportAssetsAsync({
    ...options,
    hostedUrl: EXPO_CDN,
    assetPath: '~assets',
  });
}

export async function exportAssetsAsync({
  projectRoot,
  exp,
  hostedUrl,
  assetPath,
  outputDir,
  bundles,
  experimentalBundle,
}: ExportAssetsOptions) {
  logger.global.info('Analyzing assets');

  let assets: Asset[];
  if (experimentalBundle) {
    assert(outputDir, 'outputDir must be specified when exporting to EAS');
    assets = uniqBy(
      Object.values(bundles).reduce<BundleAssetWithFileHashes[]>(
        (prev, cur) => prev.concat(cur.assets),
        []
      ),
      asset => asset.hash
    );
  } else {
    const assetCdnPath = urljoin(hostedUrl, assetPath);
    assets = await collectAssets(projectRoot, exp, assetCdnPath, bundles);
  }

  logger.global.info('Saving assets');

  if (assets.length > 0 && assets[0].fileHashes) {
    if (outputDir) {
      await saveAssetsAsync(projectRoot, assets, outputDir);
    } else {
      // No output directory defined, use remote url.
      await uploadAssetsAsync(projectRoot, assets);
    }
  } else {
    logger.global.info({ quiet: true }, 'No assets to upload, skipped.');
  }

  // Updates the manifest to reflect additional asset bundling + configs
  await _configureExpForAssets(projectRoot, exp, assets);

  return { exp, assets };
}

/**
 * Collect list of assets missing on host
 *
 * @param paths asset paths found locally that need to be uploaded.
 */
async function fetchMissingAssetsAsync(paths: string[]): Promise<string[]> {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2.clientForUser(user);
  const result = await api.postAsync('assets/metadata', { keys: paths });

  const metas = result.metadata;
  const missing = paths.filter(key => !metas[key].exists);
  return missing;
}

function logAssetTask(projectRoot: string, action: 'uploading' | 'saving', pathName: string) {
  ProjectUtils.logDebug(projectRoot, 'expo', `${action} ${pathName}`);

  const relativePath = pathName.replace(projectRoot, '');
  logger.global.info({ quiet: true }, `${action} ${relativePath}`);
}

// TODO(jesse): Add analytics for upload
async function uploadAssetsAsync(projectRoot: string, assets: Asset[]) {
  // Collect paths by key, also effectively handles duplicates in the array
  const paths = collectAssetPaths(assets);

  const missing = await fetchMissingAssetsAsync(Object.keys(paths));

  if (missing.length === 0) {
    logger.global.info({ quiet: true }, `No assets changed, skipped.`);
    return;
  }

  const keyChunks = chunk(missing, 5);

  // Upload them in chunks of 5 to prevent network and system issues.
  for (const keys of keyChunks) {
    const formData = new FormData();
    for (const key of keys) {
      const pathName = paths[key];

      logAssetTask(projectRoot, 'uploading', pathName);

      formData.append(key, fs.createReadStream(pathName), pathName);
    }

    // TODO: Document what's going on
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    await api.uploadFormDataAsync('assets/upload', formData);
  }
}

function collectAssetPaths(assets: Asset[]): Record<string, string> {
  // Collect paths by key, also effectively handles duplicates in the array
  const paths: { [fileHash: string]: string } = {};
  assets.forEach(asset => {
    asset.files.forEach((path: string, index: number) => {
      paths[asset.fileHashes[index]] = path;
    });
  });
  return paths;
}

async function saveAssetsAsync(projectRoot: string, assets: Asset[], outputDir: string) {
  // Collect paths by key, also effectively handles duplicates in the array
  const paths = collectAssetPaths(assets);

  // save files one chunk at a time
  const keyChunks = chunk(Object.keys(paths), 5);
  for (const keys of keyChunks) {
    const promises = [];
    for (const key of keys) {
      const pathName = paths[key];

      logAssetTask(projectRoot, 'saving', pathName);

      const assetPath = path.resolve(outputDir, 'assets', key);

      // copy file over to assetPath
      promises.push(fs.copy(pathName, assetPath));
    }
    await Promise.all(promises);
  }
  logger.global.info('Files successfully saved.');
}

/**
 * Collects all the assets declared in the android app, ios app and manifest
 *
 * @param {string} hostedAssetPrefix
 *    The path where assets are hosted (ie) http://xxx.cloudfront.com/assets/
 *
 * @modifies {exp} Replaces relative asset paths in the manifest with hosted URLS
 *
 */
async function collectAssets(
  projectRoot: string,
  exp: ExpoAppManifest,
  hostedAssetPrefix: string,
  bundles: BundlesByPlatform
): Promise<Asset[]> {
  // Resolve manifest assets to their hosted URL and add them to the list of assets to
  // be uploaded. Modifies exp.
  const manifestAssets: Asset[] = [];
  await resolveManifestAssets({
    projectRoot,
    manifest: exp,
    async resolver(assetPath) {
      const absolutePath = path.resolve(projectRoot, assetPath);
      const contents = await fs.readFile(absolutePath);
      const hash = md5hex(contents);
      manifestAssets.push({ files: [absolutePath], fileHashes: [hash], hash });
      return urljoin(hostedAssetPrefix, hash);
    },
    strict: true,
  });

  return Object.values(bundles)
    .reduce<Asset[]>((prev, cur) => prev.concat(cur.assets), [])
    .concat(manifestAssets);
}

export async function resolveAndCollectExpoUpdatesManifestAssets(
  projectRoot: string,
  exp: ExpoConfig,
  urlResolver: (path: string) => string
): Promise<{ url: string; hash: string; key: string; contentType: string }[]> {
  const manifestAssets: { url: string; hash: string; key: string; contentType: string }[] = [];
  await resolveExpoUpdatesManifestAssets({
    projectRoot,
    manifest: exp,
    async assetKeyResolver(assetPath) {
      const absolutePath = path.resolve(projectRoot, assetPath);
      const contents = await fs.readFile(absolutePath);
      // Expo Updates spec dictates that this hash is sha256
      const hash = crypto.createHash('sha256').update(contents).digest('hex');
      manifestAssets.push({
        url: urlResolver(assetPath),
        hash,
        key: assetPath,
        contentType: mime.getType(absolutePath) ?? 'application/octet-stream',
      });
      return assetPath;
    },
  });
  return manifestAssets;
}
