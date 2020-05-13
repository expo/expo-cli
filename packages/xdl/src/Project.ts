import {
  ExpoConfig,
  HookArguments,
  PackageJSONConfig,
  Platform,
  PostPublishHook,
  ProjectTarget,
  configFilename,
  getConfig,
  getDefaultTarget,
  readExpRcAsync,
  resolveModule,
} from '@expo/config';

import slug from 'slugify';
import { getBareExtensions, getManagedExtensions } from '@expo/config/paths';
import { MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';
import JsonFile from '@expo/json-file';
import ngrok from '@expo/ngrok';
import axios from 'axios';
import child_process from 'child_process';
import crypto from 'crypto';
import decache from 'decache';
import delayAsync from 'delay-async';
import express from 'express';
import freeportAsync from 'freeport-async';
import fs from 'fs-extra';
import getenv from 'getenv';
import HashIds from 'hashids';
import joi from 'joi';
import chunk from 'lodash/chunk';
import escapeRegExp from 'lodash/escapeRegExp';
import get from 'lodash/get';
import reduce from 'lodash/reduce';
import set from 'lodash/set';
import uniq from 'lodash/uniq';
import md5hex from 'md5hex';
import minimatch from 'minimatch';
import { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import http from 'http';
import { URL } from 'url';
import readLastLines from 'read-last-lines';
import semver from 'semver';
import split from 'split';
import treekill from 'tree-kill';
import urljoin from 'url-join';
import { promisify } from 'util';
import uuid from 'uuid';

import * as Analytics from './Analytics';
import * as Android from './Android';
import Api from './Api';
import ApiV2 from './ApiV2';
import { writeArtifactSafelyAsync } from './tools/ArtifactUtils';
import Config from './Config';
import * as ExponentTools from './detach/ExponentTools';
import * as DevSession from './DevSession';
import * as EmbeddedAssets from './EmbeddedAssets';
import { maySkipManifestValidation } from './Env';
import { ErrorCode } from './ErrorCode';
import * as Exp from './Exp';
import logger from './Logger';
import * as ExpSchema from './project/ExpSchema';
import * as ProjectUtils from './project/ProjectUtils';
import * as ProjectSettings from './ProjectSettings';
import * as Sentry from './Sentry';
import * as ThirdParty from './ThirdParty';
import FormData from './tools/FormData';
import * as UrlUtils from './UrlUtils';
import UserManager, { ANONYMOUS_USERNAME, User } from './User';
import UserSettings from './UserSettings';
import * as Versions from './Versions';
import * as Watchman from './Watchman';
import * as Webpack from './Webpack';
import XDLError from './XDLError';

import * as Doctor from './project/Doctor';
import * as IosPlist from './detach/IosPlist';
// @ts-ignore IosWorkspace not yet converted to TypeScript
import * as IosWorkspace from './detach/IosWorkspace';
import { ConnectionStatus } from './xdl';

const EXPO_CDN = 'https://d1wp6m56sqw74a.cloudfront.net';
const MINIMUM_BUNDLE_SIZE = 500;
const TUNNEL_TIMEOUT = 10 * 1000;

const treekillAsync = promisify<number, string>(treekill);
const ngrokConnectAsync = promisify(ngrok.connect);
const ngrokKillAsync = promisify(ngrok.kill);

type CachedSignedManifest =
  | {
      manifestString: null;
      signedManifest: null;
    }
  | {
      manifestString: string;
      signedManifest: string;
    };

let _cachedSignedManifest: CachedSignedManifest = {
  manifestString: null,
  signedManifest: null,
};

type Asset =
  | { fileHashes: string[]; files: string[]; hash: string }
  | {
      __packager_asset: true;
      fileHashes: string[];
      files: string[];
      fileSystemLocation: string;
      hash: string;
      httpServerLocation: string;
      name: string;
      scales: number[];
      type: string;
    };

type ManifestResolutionError = Error & {
  localAssetPath?: string;
  manifestField?: string;
};

type PublicConfig = ExpoConfig & {
  sdkVersion: string;
};

type SelfHostedIndex = PublicConfig & {
  dependencies: string[];
};

type LoadedPostPublishHook = PostPublishHook & {
  _fn: (input: HookArguments) => any;
};

export type StartOptions = {
  reset?: boolean;
  nonInteractive?: boolean;
  nonPersistent?: boolean;
  maxWorkers?: number;
  webOnly?: boolean;
  target?: ProjectTarget;
};

type PublishOptions = {
  releaseChannel?: string;
  target?: ProjectTarget;
};

type PackagerOptions = {
  dev: boolean;
  minify: boolean;
};

type Release = {
  fullName: string;
  channel: string;
  channelId: string;
  publicationId: string;
  appVersion: string;
  sdkVersion: string;
  publishedTime: string;
  platform: string;
};

export type ProjectStatus = 'running' | 'ill' | 'exited';

export async function currentStatus(projectDir: string): Promise<ProjectStatus> {
  const { packagerPort, expoServerPort } = await ProjectSettings.readPackagerInfoAsync(projectDir);
  if (packagerPort && expoServerPort) {
    return 'running';
  } else if (packagerPort || expoServerPort) {
    return 'ill';
  } else {
    return 'exited';
  }
}

// DECPRECATED: use UrlUtils.constructManifestUrlAsync
export async function getManifestUrlWithFallbackAsync(
  projectRoot: string
): Promise<{ url: string; isUrlFallback: false }> {
  return {
    url: await UrlUtils.constructManifestUrlAsync(projectRoot),
    isUrlFallback: false,
  };
}

async function _assertValidProjectRoot(projectRoot: string) {
  if (!projectRoot) {
    throw new XDLError('NO_PROJECT_ROOT', 'No project root specified');
  }
}

async function _getFreePortAsync(rangeStart: number) {
  let port = await freeportAsync(rangeStart, { hostnames: [null, 'localhost'] });
  if (!port) {
    throw new XDLError('NO_PORT_FOUND', 'No available port found');
  }

  return port;
}

async function _getForPlatformAsync(
  projectRoot: string,
  url: string,
  platform: Platform,
  { errorCode, minLength }: { errorCode: ErrorCode; minLength?: number }
): Promise<string> {
  let fullUrl = `${url}&platform=${platform}`;
  let response;

  try {
    response = await axios.get(fullUrl, {
      responseType: 'text',
      // Workaround for https://github.com/axios/axios/issues/907.
      // Without transformResponse, axios will parse the body as JSON regardless of the responseType/
      transformResponse: [data => data],
      proxy: false,
      validateStatus: status => status === 200,
      headers: {
        'Exponent-Platform': platform,
      },
    });
  } catch (error) {
    if (error.response) {
      if (error.response.data) {
        let body;
        try {
          body = JSON.parse(error.response.data);
        } catch (e) {
          ProjectUtils.logError(projectRoot, 'expo', error.response.data);
        }

        if (body) {
          if (body.message) {
            ProjectUtils.logError(projectRoot, 'expo', body.message);
          } else {
            ProjectUtils.logError(projectRoot, 'expo', error.response.data);
          }
        }
      }
      throw new XDLError(
        errorCode,
        `Packager URL ${fullUrl} returned unexpected code ${error.response.status}. ` +
          'Please open your project in the Expo app and see if there are any errors. ' +
          'Also scroll up and make sure there were no errors or warnings when opening your project.'
      );
    } else {
      throw error;
    }
  }

  if (!response.data || (minLength && response.data.length < minLength)) {
    throw new XDLError(errorCode, `Body is: ${response.data}`);
  }

  return response.data;
}

async function _resolveGoogleServicesFile(projectRoot: string, manifest: ExpoConfig) {
  if (manifest.android && manifest.android.googleServicesFile) {
    const contents = await fs.readFile(
      path.resolve(projectRoot, manifest.android.googleServicesFile),
      'utf8'
    );
    manifest.android.googleServicesFile = contents;
  }
  if (manifest.ios && manifest.ios.googleServicesFile) {
    const contents = await fs.readFile(
      path.resolve(projectRoot, manifest.ios.googleServicesFile),
      'base64'
    );
    manifest.ios.googleServicesFile = contents;
  }
}

async function _resolveManifestAssets(
  projectRoot: string,
  manifest: PublicConfig,
  resolver: (assetPath: string) => Promise<string>,
  strict = false
) {
  try {
    // Asset fields that the user has set
    const assetSchemas = (
      await ExpSchema.getAssetSchemasAsync(manifest.sdkVersion)
    ).filter((assetSchema: ExpSchema.AssetSchema) => get(manifest, assetSchema.fieldPath));

    // Get the URLs
    const urls = await Promise.all(
      assetSchemas.map(async (assetSchema: ExpSchema.AssetSchema) => {
        const pathOrURL = get(manifest, assetSchema.fieldPath);
        if (pathOrURL.match(/^https?:\/\/(.*)$/)) {
          // It's a remote URL
          return pathOrURL;
        } else if (fs.existsSync(path.resolve(projectRoot, pathOrURL))) {
          return await resolver(pathOrURL);
        } else {
          const err: ManifestResolutionError = new Error('Could not resolve local asset.');
          err.localAssetPath = pathOrURL;
          err.manifestField = assetSchema.fieldPath;
          throw err;
        }
      })
    );

    // Set the corresponding URL fields
    assetSchemas.forEach((assetSchema: ExpSchema.AssetSchema, index: number) =>
      set(manifest, assetSchema.fieldPath + 'Url', urls[index])
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

function _requireFromProject(modulePath: string, projectRoot: string, exp: ExpoConfig) {
  try {
    let fullPath = resolveModule(modulePath, projectRoot, exp);
    // Clear the require cache for this module so get a fresh version of it
    // without requiring the user to restart Expo CLI
    decache(fullPath);
    // $FlowIssue: doesn't work with dynamic requires
    return require(fullPath);
  } catch (e) {
    return null;
  }
}

// TODO: Move to @expo/config
export async function getSlugAsync(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  if (exp.slug) {
    return exp.slug;
  }
  throw new XDLError(
    'INVALID_MANIFEST',
    `Your project config in ${projectRoot} must contain a "slug" field. Please supply this in your app.config.js or app.json`
  );
}

export async function getLatestReleaseAsync(
  projectRoot: string,
  options: {
    releaseChannel: string;
    platform: string;
    owner?: string;
  }
): Promise<Release | null> {
  let result;
  if (process.env.EXPO_LEGACY_API === 'true') {
    // TODO(ville): move request from multipart/form-data to JSON once supported by the endpoint.
    let formData = new FormData();
    formData.append('queryType', 'history');
    formData.append('slug', await getSlugAsync(projectRoot));
    if (options.owner) {
      formData.append('owner', options.owner);
    }
    formData.append('version', '2');
    formData.append('count', '1');
    formData.append('releaseChannel', options.releaseChannel);
    formData.append('platform', options.platform);
    result = await Api.callMethodAsync('publishInfo', [], 'post', null, {
      formData,
    });
  } else {
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    result = await api.postAsync('publish/history', {
      owner: options.owner,
      slug: await getSlugAsync(projectRoot),
      releaseChannel: options.releaseChannel,
      count: 1,
      platform: options.platform,
    });
  }
  const { queryResult } = result;
  if (queryResult && queryResult.length > 0) {
    return queryResult[0];
  } else {
    return null;
  }
}

// Takes multiple exported apps in sourceDirs and coalesces them to one app in outputDir
export async function mergeAppDistributions(
  projectRoot: string,
  sourceDirs: Array<string>,
  outputDir: string
): Promise<void> {
  const assetPathToWrite = path.resolve(projectRoot, outputDir, 'assets');
  await fs.ensureDir(assetPathToWrite);
  const bundlesPathToWrite = path.resolve(projectRoot, outputDir, 'bundles');
  await fs.ensureDir(bundlesPathToWrite);

  // merge files from bundles and assets
  const androidIndexes: SelfHostedIndex[] = [];
  const iosIndexes: SelfHostedIndex[] = [];

  for (let sourceDir of sourceDirs) {
    const promises = [];

    // copy over assets/bundles from other src dirs to the output dir
    if (sourceDir !== outputDir) {
      // copy file over to assetPath
      const sourceAssetDir = path.resolve(projectRoot, sourceDir, 'assets');
      const outputAssetDir = path.resolve(projectRoot, outputDir, 'assets');
      const assetPromise = fs.copy(sourceAssetDir, outputAssetDir);
      promises.push(assetPromise);

      // copy files over to bundlePath
      const sourceBundleDir = path.resolve(projectRoot, sourceDir, 'bundles');
      const outputBundleDir = path.resolve(projectRoot, outputDir, 'bundles');
      const bundlePromise = fs.copy(sourceBundleDir, outputBundleDir);
      promises.push(bundlePromise);

      await Promise.all(promises);
    }

    // put index.jsons into memory
    const putJsonInMemory = async (indexPath: string, accumulator: SelfHostedIndex[]) => {
      const index = (await JsonFile.readAsync(indexPath)) as SelfHostedIndex;
      if (!index.sdkVersion) {
        throw new XDLError(
          'INVALID_MANIFEST',
          `Invalid index.json, must specify an sdkVersion at ${indexPath}`
        );
      }
      if (Array.isArray(index)) {
        // index.json could also be an array
        accumulator.push(...index);
      } else {
        accumulator.push(index);
      }
    };

    const androidIndexPath = path.resolve(projectRoot, sourceDir, 'android-index.json');
    await putJsonInMemory(androidIndexPath, androidIndexes);

    const iosIndexPath = path.resolve(projectRoot, sourceDir, 'ios-index.json');
    await putJsonInMemory(iosIndexPath, iosIndexes);
  }

  // sort indexes by descending sdk value
  const getSortedIndex = (indexes: SelfHostedIndex[]) => {
    return indexes.sort((index1: SelfHostedIndex, index2: SelfHostedIndex) => {
      if (semver.eq(index1.sdkVersion, index2.sdkVersion)) {
        logger.global.error(
          `Encountered multiple index.json with the same SDK version ${index1.sdkVersion}. This could result in undefined behavior.`
        );
      }
      return semver.gte(index1.sdkVersion, index2.sdkVersion) ? -1 : 1;
    });
  };

  const sortedAndroidIndexes = getSortedIndex(androidIndexes);
  const sortedIosIndexes = getSortedIndex(iosIndexes);

  // Save the json arrays to disk
  await writeArtifactSafelyAsync(
    projectRoot,
    null,
    path.join(outputDir, 'android-index.json'),
    JSON.stringify(sortedAndroidIndexes)
  );

  await writeArtifactSafelyAsync(
    projectRoot,
    null,
    path.join(outputDir, 'ios-index.json'),
    JSON.stringify(sortedIosIndexes)
  );
}

/**
 * Apps exporting for self hosting will have the files created in the project directory the following way:
.
├── android-index.json
├── ios-index.json
├── assets
│   └── 1eccbc4c41d49fd81840aef3eaabe862
└── bundles
      ├── android-01ee6e3ab3e8c16a4d926c91808d5320.js
      └── ios-ee8206cc754d3f7aa9123b7f909d94ea.js
 */
export async function exportForAppHosting(
  projectRoot: string,
  publicUrl: string,
  assetUrl: string,
  outputDir: string,
  options: {
    isDev?: boolean;
    dumpAssetmap?: boolean;
    dumpSourcemap?: boolean;
    publishOptions?: PublishOptions;
  } = {}
): Promise<void> {
  await _validatePackagerReadyAsync(projectRoot);
  const defaultTarget = getDefaultTarget(projectRoot);
  const target = options.publishOptions?.target ?? defaultTarget;

  // build the bundles
  let packagerOpts = {
    dev: !!options.isDev,
    minify: true,
  };
  // make output dirs if not exists
  const assetPathToWrite = path.resolve(projectRoot, path.join(outputDir, 'assets'));
  await fs.ensureDir(assetPathToWrite);
  const bundlesPathToWrite = path.resolve(projectRoot, path.join(outputDir, 'bundles'));
  await fs.ensureDir(bundlesPathToWrite);

  const { iosBundle, androidBundle } = await _buildPublishBundlesAsync(projectRoot, packagerOpts);
  const iosBundleHash = crypto.createHash('md5').update(iosBundle).digest('hex');
  const iosBundleUrl = `ios-${iosBundleHash}.js`;
  const iosJsPath = path.join(outputDir, 'bundles', iosBundleUrl);

  const androidBundleHash = crypto.createHash('md5').update(androidBundle).digest('hex');
  const androidBundleUrl = `android-${androidBundleHash}.js`;
  const androidJsPath = path.join(outputDir, 'bundles', androidBundleUrl);

  await writeArtifactSafelyAsync(projectRoot, null, iosJsPath, iosBundle);
  await writeArtifactSafelyAsync(projectRoot, null, androidJsPath, androidBundle);
  logger.global.info('Finished saving JS Bundles.');

  // save the assets
  // Get project config
  const publishOptions = options.publishOptions || {};
  const { exp, pkg } = await _getPublishExpConfigAsync(projectRoot, publishOptions);
  const { assets } = await _fetchAndSaveAssetsAsync(projectRoot, exp, publicUrl, outputDir);

  if (options.dumpAssetmap) {
    logger.global.info('Dumping asset map.');
    const assetmap: { [hash: string]: Asset } = {};
    assets.forEach((asset: Asset) => {
      assetmap[asset.hash] = asset;
    });
    await writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(outputDir, 'assetmap.json'),
      JSON.stringify(assetmap)
    );
  }

  // Delete keys that are normally deleted in the publish process
  delete exp.hooks;

  // Add assetUrl to manifest
  exp.assetUrlOverride = assetUrl;

  exp.publishedTime = new Date().toISOString();
  exp.commitTime = new Date().toISOString();
  exp.releaseId = uuid.v4();

  // generate revisionId and id the same way www does
  const hashIds = new HashIds(uuid.v1(), 10);
  exp.revisionId = hashIds.encode(Date.now());

  if (options.isDev) {
    exp.developer = {
      tool: 'exp',
    };
  }

  if (!exp.slug) {
    throw new XDLError('INVALID_MANIFEST', 'Must provide a slug field in the app.json manifest.');
  }
  let username = await UserManager.getCurrentUsernameAsync();
  if (!username) {
    username = ANONYMOUS_USERNAME;
  }
  exp.id = `@${username}/${exp.slug}`;

  // save the android manifest
  const androidManifest = {
    ...exp,
    bundleUrl: urljoin(publicUrl, 'bundles', androidBundleUrl),
    platform: 'android',
    dependencies: Object.keys(pkg.dependencies),
  };
  await writeArtifactSafelyAsync(
    projectRoot,
    null,
    path.join(outputDir, 'android-index.json'),
    JSON.stringify(androidManifest)
  );

  // save the ios manifest
  const iosManifest = {
    ...exp,
    bundleUrl: urljoin(publicUrl, 'bundles', iosBundleUrl),
    platform: 'ios',
    dependencies: Object.keys(pkg.dependencies),
  };
  await writeArtifactSafelyAsync(
    projectRoot,
    null,
    path.join(outputDir, 'ios-index.json'),
    JSON.stringify(iosManifest)
  );

  let iosSourceMap = null;
  let androidSourceMap = null;

  // build source maps
  if (options.dumpSourcemap) {
    ({ iosSourceMap, androidSourceMap } = await _buildSourceMapsAsync(projectRoot));
    // write the sourcemap files
    const iosMapName = `ios-${iosBundleHash}.map`;
    const iosMapPath = path.join(outputDir, 'bundles', iosMapName);
    await writeArtifactSafelyAsync(projectRoot, null, iosMapPath, iosSourceMap);

    const androidMapName = `android-${androidBundleHash}.map`;
    const androidMapPath = path.join(outputDir, 'bundles', androidMapName);
    await writeArtifactSafelyAsync(projectRoot, null, androidMapPath, androidSourceMap);

    // Remove original mapping to incorrect sourcemap paths
    logger.global.info('Configuring sourcemaps');
    await truncateLastNLines(iosJsPath, 1);
    await truncateLastNLines(androidJsPath, 1);

    // Add correct mapping to sourcemap paths
    await fs.appendFile(iosJsPath, `\n//# sourceMappingURL=${iosMapName}`);
    await fs.appendFile(androidJsPath, `\n//# sourceMappingURL=${androidMapName}`);

    // Make a debug html so user can debug their bundles
    logger.global.info('Preparing additional debugging files');
    const debugHtml = `
    <script src="${urljoin('bundles', iosBundleUrl)}"></script>
    <script src="${urljoin('bundles', androidBundleUrl)}"></script>
    Open up this file in Chrome. In the Javascript developer console, navigate to the Source tab.
    You can see a red coloured folder containing the original source code from your bundle.
    `;
    await writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(outputDir, 'debug.html'),
      debugHtml
    );
  }

  // configure embedded assets for expo-updates or ExpoKit
  await EmbeddedAssets.configureAsync({
    projectRoot,
    pkg,
    exp,
    iosManifestUrl: urljoin(publicUrl, 'ios-index.json'),
    iosManifest,
    iosBundle,
    iosSourceMap,
    androidManifestUrl: urljoin(publicUrl, 'android-index.json'),
    androidManifest,
    androidBundle,
    androidSourceMap,
    target,
  });
}

// truncate the last n lines in a file
async function truncateLastNLines(filePath: string, n: number) {
  const lines = await readLastLines.read(filePath, n);
  const to_vanquish = lines.length;
  const { size } = await fs.stat(filePath);
  await fs.truncate(filePath, size - to_vanquish);
}

async function _saveAssetAsync(projectRoot: string, assets: Asset[], outputDir: string) {
  // Collect paths by key, also effectively handles duplicates in the array
  const paths: { [fileHash: string]: string } = {};
  assets.forEach(asset => {
    asset.files.forEach((path: string, index: number) => {
      paths[asset.fileHashes[index]] = path;
    });
  });

  // save files one chunk at a time
  const keyChunks = chunk(Object.keys(paths), 5);
  for (const keys of keyChunks) {
    const promises = [];
    for (const key of keys) {
      ProjectUtils.logDebug(projectRoot, 'expo', `uploading ${paths[key]}`);

      logger.global.info({ quiet: true }, `Saving ${paths[key]}`);

      let assetPath = path.resolve(outputDir, 'assets', key);

      // copy file over to assetPath
      const p = fs.copy(paths[key], assetPath);
      promises.push(p);
    }
    await Promise.all(promises);
  }
  logger.global.info('Files successfully saved.');
}

export async function findReusableBuildAsync(
  releaseChannel: string,
  platform: string,
  sdkVersion: string,
  slug: string
): Promise<{ downloadUrl?: string; canReuse: boolean }> {
  const user = await UserManager.getCurrentUserAsync();

  const buildReuseStatus = await ApiV2.clientForUser(user).postAsync('standalone-build/reuse', {
    releaseChannel,
    platform,
    sdkVersion,
    slug,
  });

  return buildReuseStatus;
}

export async function publishAsync(
  projectRoot: string,
  options: PublishOptions = {}
): Promise<{ url: string; ids: string[]; err?: string }> {
  const user = await UserManager.ensureLoggedInAsync();
  const target = options.target ?? getDefaultTarget(projectRoot);
  await _validatePackagerReadyAsync(projectRoot);
  Analytics.logEvent('Publish', {
    projectRoot,
    developerTool: Config.developerTool,
  });

  const validationStatus = await Doctor.validateWithNetworkAsync(projectRoot);
  if (validationStatus === Doctor.ERROR || validationStatus === Doctor.FATAL) {
    throw new XDLError(
      'PUBLISH_VALIDATION_ERROR',
      "Couldn't publish because errors were found. (See logs above.) Please fix the errors and try again."
    );
  }

  // Get project config
  let { exp, pkg } = await _getPublishExpConfigAsync(projectRoot, options);

  // TODO: refactor this out to a function, throw error if length doesn't match
  let { hooks } = exp;
  delete exp.hooks;
  let validPostPublishHooks: LoadedPostPublishHook[] = [];
  if (hooks && hooks.postPublish) {
    hooks.postPublish.forEach((hook: any) => {
      let { file } = hook;
      let fn = _requireFromProject(file, projectRoot, exp);
      if (typeof fn !== 'function') {
        logger.global.error(
          `Unable to load postPublishHook: '${file}'. The module does not export a function.`
        );
      } else {
        hook._fn = fn;
        validPostPublishHooks.push(hook);
      }
    });

    if (validPostPublishHooks.length !== hooks.postPublish.length) {
      logger.global.error();

      throw new XDLError(
        'HOOK_INITIALIZATION_ERROR',
        'Please fix your postPublish hook configuration.'
      );
    }
  }

  let { iosBundle, androidBundle } = await _buildPublishBundlesAsync(projectRoot);

  await _fetchAndUploadAssetsAsync(projectRoot, exp);

  const hasHooks = validPostPublishHooks.length > 0;

  const shouldPublishAndroidMaps = !!exp.android && !!exp.android.publishSourceMapPath;

  const shouldPublishIosMaps = !!exp.ios && !!exp.ios.publishSourceMapPath;

  let { iosSourceMap, androidSourceMap } = await _maybeBuildSourceMapsAsync(projectRoot, exp, {
    force: hasHooks || shouldPublishAndroidMaps || shouldPublishIosMaps,
  });

  let response;
  try {
    response = await _uploadArtifactsAsync({
      pkg,
      exp,
      iosBundle,
      androidBundle,
      options,
    });
  } catch (e) {
    if (e.serverError === 'SCHEMA_VALIDATION_ERROR') {
      throw new Error(
        `There was an error validating your project schema. Check for any warnings about the contents of your app.json or app.config.js.`
      );
    }
    Sentry.captureException(e);
    throw e;
  }

  let androidManifest = {};
  let iosManifest = {};

  if (
    validPostPublishHooks.length ||
    (exp.ios && exp.ios.publishManifestPath) ||
    (exp.android && exp.android.publishManifestPath) ||
    EmbeddedAssets.shouldEmbedAssetsForExpoUpdates(projectRoot, exp, pkg, target)
  ) {
    [androidManifest, iosManifest] = await Promise.all([
      ExponentTools.getManifestAsync(response.url, {
        'Exponent-SDK-Version': exp.sdkVersion,
        'Exponent-Platform': 'android',
        'Expo-Release-Channel': options.releaseChannel,
        Accept: 'application/expo+json,application/json',
      }),
      ExponentTools.getManifestAsync(response.url, {
        'Exponent-SDK-Version': exp.sdkVersion,
        'Exponent-Platform': 'ios',
        'Expo-Release-Channel': options.releaseChannel,
        Accept: 'application/expo+json,application/json',
      }),
    ]);

    const hookOptions = {
      url: response.url,
      exp,
      iosBundle,
      iosSourceMap,
      iosManifest,
      androidBundle,
      androidSourceMap,
      androidManifest,
      projectRoot,
      log: (msg: any) => {
        logger.global.info({ quiet: true }, msg);
      },
    };

    for (let hook of validPostPublishHooks) {
      logger.global.info(`Running postPublish hook: ${hook.file}`);
      try {
        let result = hook._fn({
          config: hook.config,
          ...hookOptions,
        });

        // If it's a promise, wait for it to resolve
        if (result && result.then) {
          result = await result;
        }

        if (result) {
          logger.global.info({ quiet: true }, result);
        }
      } catch (e) {
        logger.global.warn(`Warning: postPublish hook '${hook.file}' failed: ${e.stack}`);
      }
    }
  }

  const fullManifestUrl = response.url.replace('exp://', 'https://');
  await EmbeddedAssets.configureAsync({
    projectRoot,
    pkg,
    exp,
    releaseChannel: options.releaseChannel ?? 'default',
    iosManifestUrl: fullManifestUrl,
    iosManifest,
    iosBundle,
    iosSourceMap,
    androidManifestUrl: fullManifestUrl,
    androidManifest,
    androidBundle,
    androidSourceMap,
    target,
  });

  // TODO: move to postPublish hook
  if (exp.isKernel) {
    await _handleKernelPublishedAsync({
      user,
      exp,
      projectRoot,
      url: response.url,
    });
  }

  return {
    ...response,
    url:
      options.releaseChannel && options.releaseChannel !== 'default'
        ? `${response.url}?release-channel=${options.releaseChannel}`
        : response.url,
  };
}

async function _uploadArtifactsAsync({
  exp,
  iosBundle,
  androidBundle,
  options,
  pkg,
}: {
  exp: ExpoConfig;
  iosBundle: string;
  androidBundle: string;
  options: PublishOptions;
  pkg: PackageJSONConfig;
}) {
  logger.global.info('Uploading JavaScript bundles');
  let formData = new FormData();

  formData.append('expJson', JSON.stringify(exp));
  formData.append('packageJson', JSON.stringify(pkg));
  formData.append('iosBundle', iosBundle, 'iosBundle');
  formData.append('androidBundle', androidBundle, 'androidBundle');
  formData.append('options', JSON.stringify(options));

  let response: any;
  if (process.env.EXPO_LEGACY_API === 'true') {
    response = await Api.callMethodAsync('publish', null, 'put', null, { formData });
  } else {
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    response = await api.uploadFormDataAsync('publish/new', formData);
  }
  return response;
}

async function _validatePackagerReadyAsync(projectRoot: string) {
  _assertValidProjectRoot(projectRoot);

  // Ensure the packager is started
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      'Metro Bundler is not running. Trying to restart it...'
    );
    await startReactNativeServerAsync(projectRoot, { reset: true });
  }
}

async function _getPublishExpConfigAsync(
  projectRoot: string,
  options: PublishOptions
): Promise<{
  exp: PublicConfig;
  pkg: PackageJSONConfig;
}> {
  let schema = joi.object().keys({
    releaseChannel: joi.string(),
  });

  // Validate schema
  const { error } = joi.validate(options, schema);
  if (error) {
    throw new XDLError('INVALID_OPTIONS', error.toString());
  }
  options.releaseChannel = options.releaseChannel || 'default'; // joi default not enforcing this :/

  // Verify that exp/app.json and package.json exist
  const { exp, pkg } = getConfig(projectRoot);

  if (exp.android && exp.android.config) {
    delete exp.android.config;
  }

  if (exp.ios && exp.ios.config) {
    delete exp.ios.config;
  }

  const { sdkVersion } = exp;

  // Only allow projects to be published with UNVERSIONED if a correct token is set in env
  if (sdkVersion === 'UNVERSIONED' && !maySkipManifestValidation()) {
    throw new XDLError('INVALID_OPTIONS', 'Cannot publish with sdkVersion UNVERSIONED.');
  }
  exp.locales = await ExponentTools.getResolvedLocalesAsync(exp);
  return { exp: { ...exp, sdkVersion: sdkVersion! }, pkg };
}

// Fetch iOS and Android bundles for publishing
async function _buildPublishBundlesAsync(projectRoot: string, opts?: PackagerOptions) {
  const entryPoint = Exp.determineEntryPoint(projectRoot);
  const publishUrl = await UrlUtils.constructPublishUrlAsync(
    projectRoot,
    entryPoint,
    undefined,
    opts
  );

  logger.global.info('Building iOS bundle');
  const iosBundle = await _getForPlatformAsync(projectRoot, publishUrl, 'ios', {
    errorCode: 'INVALID_BUNDLE',
    minLength: MINIMUM_BUNDLE_SIZE,
  });

  logger.global.info('Building Android bundle');
  const androidBundle = await _getForPlatformAsync(projectRoot, publishUrl, 'android', {
    errorCode: 'INVALID_BUNDLE',
    minLength: MINIMUM_BUNDLE_SIZE,
  });

  return { iosBundle, androidBundle };
}

async function _maybeBuildSourceMapsAsync(
  projectRoot: string,
  exp: ExpoConfig,
  options = { force: false }
) {
  if (options.force) {
    return _buildSourceMapsAsync(projectRoot);
  } else {
    return { iosSourceMap: null, androidSourceMap: null };
  }
}

// note(brentvatne): currently we build source map anytime there is a
// postPublish hook -- we may have an option in the future to manually
// enable sourcemap building, but for now it's very fast, most apps in
// production should use sourcemaps for error reporting, and in the worst
// case, adding a few seconds to a postPublish hook isn't too annoying
async function _buildSourceMapsAsync(projectRoot: string) {
  let entryPoint = Exp.determineEntryPoint(projectRoot);
  let sourceMapUrl = await UrlUtils.constructSourceMapUrlAsync(projectRoot, entryPoint);

  logger.global.info('Building sourcemaps');
  let iosSourceMap = await _getForPlatformAsync(projectRoot, sourceMapUrl, 'ios', {
    errorCode: 'INVALID_BUNDLE',
    minLength: MINIMUM_BUNDLE_SIZE,
  });

  let androidSourceMap = await _getForPlatformAsync(projectRoot, sourceMapUrl, 'android', {
    errorCode: 'INVALID_BUNDLE',
    minLength: MINIMUM_BUNDLE_SIZE,
  });

  return { iosSourceMap, androidSourceMap };
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
async function _collectAssets(
  projectRoot: string,
  exp: PublicConfig,
  hostedAssetPrefix: string
): Promise<Asset[]> {
  let entryPoint = Exp.determineEntryPoint(projectRoot);
  let assetsUrl = await UrlUtils.constructAssetsUrlAsync(projectRoot, entryPoint);

  let iosAssetsJson = await _getForPlatformAsync(projectRoot, assetsUrl, 'ios', {
    errorCode: 'INVALID_ASSETS',
  });

  let androidAssetsJson = await _getForPlatformAsync(projectRoot, assetsUrl, 'android', {
    errorCode: 'INVALID_ASSETS',
  });

  // Resolve manifest assets to their hosted URL and add them to the list of assets to
  // be uploaded. Modifies exp.
  const manifestAssets: Asset[] = [];
  await _resolveManifestAssets(
    projectRoot,
    exp,
    async (assetPath: string) => {
      const absolutePath = path.resolve(projectRoot, assetPath);
      const contents = await fs.readFile(absolutePath);
      const hash = md5hex(contents);
      manifestAssets.push({ files: [absolutePath], fileHashes: [hash], hash });
      return urljoin(hostedAssetPrefix, hash);
    },
    true
  );

  // Upload asset files
  const iosAssets = JSON.parse(iosAssetsJson);
  const androidAssets = JSON.parse(androidAssetsJson);
  return iosAssets.concat(androidAssets).concat(manifestAssets);
}

/**
 * Configures exp, preparing it for asset export
 *
 * @modifies {exp}
 *
 */
async function _configureExpForAssets(projectRoot: string, exp: ExpoConfig, assets: Asset[]) {
  // Add google services file if it exists
  await _resolveGoogleServicesFile(projectRoot, exp);

  // Convert asset patterns to a list of asset strings that match them.
  // Assets strings are formatted as `asset_<hash>.<type>` and represent
  // the name that the file will have in the app bundle. The `asset_` prefix is
  // needed because android doesn't support assets that start with numbers.
  if (exp.assetBundlePatterns) {
    const fullPatterns: string[] = exp.assetBundlePatterns.map((p: string) =>
      path.join(projectRoot, p)
    );
    logger.global.info('Processing asset bundle patterns:');
    fullPatterns.forEach(p => logger.global.info('- ' + p));
    // The assets returned by the RN packager has duplicates so make sure we
    // only bundle each once.
    const bundledAssets = new Set();
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

async function _fetchAndUploadAssetsAsync(projectRoot: string, exp: PublicConfig) {
  logger.global.info('Analyzing assets');

  const assetCdnPath = urljoin(EXPO_CDN, '~assets');
  const assets = await _collectAssets(projectRoot, exp, assetCdnPath);

  logger.global.info('Uploading assets');

  if (assets.length > 0 && assets[0].fileHashes) {
    await uploadAssetsAsync(projectRoot, assets);
  } else {
    logger.global.info({ quiet: true }, 'No assets to upload, skipped.');
  }

  // Updates the manifest to reflect additional asset bundling + configs
  await _configureExpForAssets(projectRoot, exp, assets);

  return exp;
}

async function _fetchAndSaveAssetsAsync(
  projectRoot: string,
  exp: PublicConfig,
  hostedUrl: string,
  outputDir: string
) {
  logger.global.info('Analyzing assets');

  const assetCdnPath = urljoin(hostedUrl, 'assets');
  const assets = await _collectAssets(projectRoot, exp, assetCdnPath);

  logger.global.info('Saving assets');

  if (assets.length > 0 && assets[0].fileHashes) {
    await _saveAssetAsync(projectRoot, assets, outputDir);
  } else {
    logger.global.info({ quiet: true }, 'No assets to upload, skipped.');
  }

  // Updates the manifest to reflect additional asset bundling + configs
  await _configureExpForAssets(projectRoot, exp, assets);

  return { exp, assets };
}

async function _handleKernelPublishedAsync({
  projectRoot,
  user,
  exp,
  url,
}: {
  projectRoot: string;
  user: User;
  exp: ExpoConfig;
  url: string;
}) {
  let kernelBundleUrl = `${Config.api.scheme}://${Config.api.host}`;
  if (Config.api.port) {
    kernelBundleUrl = `${kernelBundleUrl}:${Config.api.port}`;
  }
  kernelBundleUrl = `${kernelBundleUrl}/@${user.username}/${exp.slug}/bundle`;

  if (exp.kernel.androidManifestPath) {
    let manifest = await ExponentTools.getManifestAsync(url, {
      'Exponent-SDK-Version': exp.sdkVersion,
      'Exponent-Platform': 'android',
      Accept: 'application/expo+json,application/json',
    });
    manifest.bundleUrl = kernelBundleUrl;
    manifest.sdkVersion = 'UNVERSIONED';
    await fs.writeFile(
      path.resolve(projectRoot, exp.kernel.androidManifestPath),
      JSON.stringify(manifest)
    );
  }

  if (exp.kernel.iosManifestPath) {
    let manifest = await ExponentTools.getManifestAsync(url, {
      'Exponent-SDK-Version': exp.sdkVersion,
      'Exponent-Platform': 'ios',
      Accept: 'application/expo+json,application/json',
    });
    manifest.bundleUrl = kernelBundleUrl;
    manifest.sdkVersion = 'UNVERSIONED';
    await fs.writeFile(
      path.resolve(projectRoot, exp.kernel.iosManifestPath),
      JSON.stringify(manifest)
    );
  }
}

// TODO(jesse): Add analytics for upload
async function uploadAssetsAsync(projectRoot: string, assets: Asset[]) {
  // Collect paths by key, also effectively handles duplicates in the array
  const paths: { [fileHash: string]: string } = {};
  assets.forEach(asset => {
    asset.files.forEach((path: string, index: number) => {
      paths[asset.fileHashes[index]] = path;
    });
  });

  // Collect list of assets missing on host
  let result;
  if (process.env.EXPO_LEGACY_API === 'true') {
    result = await Api.callMethodAsync('assetsMetadata', [], 'post', { keys: Object.keys(paths) });
  } else {
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    result = await api.postAsync('assets/metadata', { keys: Object.keys(paths) });
  }
  const metas = result.metadata;
  const missing = Object.keys(paths).filter(key => !metas[key].exists);

  if (missing.length === 0) {
    logger.global.info({ quiet: true }, `No assets changed, skipped.`);
  }

  // Upload them!
  await Promise.all(
    chunk(missing, 5).map(async keys => {
      let formData = new FormData();
      for (const key of keys) {
        ProjectUtils.logDebug(projectRoot, 'expo', `uploading ${paths[key]}`);

        let relativePath = paths[key].replace(projectRoot, '');
        logger.global.info({ quiet: true }, `Uploading ${relativePath}`);

        formData.append(key, fs.createReadStream(paths[key]), paths[key]);
      }

      if (process.env.EXPO_LEGACY_API === 'true') {
        await Api.callMethodAsync('uploadAssets', [], 'put', null, { formData });
      } else {
        const user = await UserManager.ensureLoggedInAsync();
        const api = ApiV2.clientForUser(user);
        await api.uploadFormDataAsync('assets/upload', formData);
      }
    })
  );
}

type GetExpConfigOptions = {
  current?: boolean;
  mode?: string;
  platform?: 'android' | 'ios' | 'all';
  expIds?: string[];
  type?: string;
  releaseChannel?: string;
  bundleIdentifier?: string;
  publicUrl?: string;
  sdkVersion?: string;
};

async function getConfigAsync(
  projectRoot: string,
  options: Pick<GetExpConfigOptions, 'publicUrl' | 'platform'> = {}
) {
  if (!options.publicUrl) {
    // get the manifest from the project directory
    const { exp, pkg } = getConfig(projectRoot);
    const configName = configFilename(projectRoot);
    return {
      exp,
      pkg,
      configName: configFilename(projectRoot),
      configPrefix: configName === 'app.json' ? 'expo.' : '',
    };
  } else {
    // get the externally hosted manifest
    return {
      exp: await ThirdParty.getManifest(options.publicUrl, options),
      configName: options.publicUrl,
      configPrefix: '',
      pkg: {},
    };
  }
}

// TODO(ville): add the full type
type BuildJob = unknown;

export type BuildStatusResult = {
  jobs: BuildJob[];
  err: null;
  userHasBuiltAppBefore: boolean;
  userHasBuiltExperienceBefore: boolean;
  canPurchasePriorityBuilds: boolean;
  numberOfRemainingPriorityBuilds: number;
  hasUnlimitedPriorityBuilds: boolean;
};

export type BuildCreatedResult = {
  id: string;
  ids: string[];
  priority: 'normal' | 'high';
  canPurchasePriorityBuilds: boolean;
  numberOfRemainingPriorityBuilds: number;
  hasUnlimitedPriorityBuilds: boolean;
};

function _validateManifest(options: any, exp: any, configName: string, configPrefix: string) {
  if (options.platform === 'ios' || options.platform === 'all') {
    if (!exp.ios || !exp.ios.bundleIdentifier) {
      throw new XDLError(
        'INVALID_MANIFEST',
        `Must specify a bundle identifier in order to build this experience for iOS. ` +
          `Please specify one in ${configName} at "${configPrefix}ios.bundleIdentifier"`
      );
    }
  }

  if (options.platform === 'android' || options.platform === 'all') {
    if (!exp.android || !exp.android.package) {
      throw new XDLError(
        'INVALID_MANIFEST',
        `Must specify a java package in order to build this experience for Android. ` +
          `Please specify one in ${configName} at "${configPrefix}android.package"`
      );
    }
  }
}
function _validateOptions(options: any) {
  const schema = joi.object().keys({
    current: joi.boolean(),
    mode: joi.string(),
    platform: joi.any().valid('ios', 'android', 'all'),
    expIds: joi.array(),
    type: joi.any().valid('archive', 'simulator', 'client', 'app-bundle', 'apk'),
    releaseChannel: joi.string().regex(/[a-z\d][a-z\d._-]*/),
    bundleIdentifier: joi.string().regex(/^[a-zA-Z][a-zA-Z0-9\-.]+$/),
    publicUrl: joi.string(),
    sdkVersion: joi.strict(),
  });

  const { error } = joi.validate(options, schema);
  if (error) {
    throw new XDLError('INVALID_OPTIONS', error.toString());
  }
}

async function _getExpAsync(
  projectRoot: string,
  options: Pick<GetExpConfigOptions, 'publicUrl' | 'mode' | 'platform'>
) {
  const { exp, pkg, configName, configPrefix } = await getConfigAsync(projectRoot, options);

  if (!exp || !pkg) {
    throw new XDLError(
      'NO_PACKAGE_JSON',
      `Couldn't read ${configName} file in project at ${projectRoot}`
    );
  }

  // Support version and name being specified in package.json for legacy
  // support pre: exp.json
  if (!exp.version && 'version' in pkg && pkg.version) {
    exp.version = pkg.version;
  }
  if (!exp.name && 'name' in pkg && typeof pkg.name === 'string') {
    exp.name = pkg.name;
  }
  if (!exp.slug && typeof exp.name === 'string') {
    exp.slug = slug(exp.name.toLowerCase());
  }
  return { exp, configName, configPrefix };
}

export async function getBuildStatusAsync(
  projectRoot: string,
  options: GetExpConfigOptions = {}
): Promise<BuildStatusResult> {
  const user = await UserManager.ensureLoggedInAsync();

  _assertValidProjectRoot(projectRoot);
  _validateOptions(options);
  const { exp } = await _getExpAsync(projectRoot, options);

  const api = ApiV2.clientForUser(user);
  return await api.postAsync('build/status', { manifest: exp, options });
}

export async function startBuildAsync(
  projectRoot: string,
  options: GetExpConfigOptions = {}
): Promise<BuildCreatedResult> {
  const user = await UserManager.ensureLoggedInAsync();

  _assertValidProjectRoot(projectRoot);
  _validateOptions(options);
  const { exp, configName, configPrefix } = await _getExpAsync(projectRoot, options);
  _validateManifest(options, exp, configName, configPrefix);

  Analytics.logEvent('Build Shell App', {
    projectRoot,
    developerTool: Config.developerTool,
    platform: options.platform,
  });

  const api = ApiV2.clientForUser(user);
  return await api.putAsync('build/start', { manifest: exp, options });
}

export async function buildAsync(
  projectRoot: string,
  options: GetExpConfigOptions = {}
): Promise<BuildStatusResult | BuildCreatedResult> {
  /**
    This function corresponds to an apiv1 call and is deprecated.
    Use 
      * startBuildAsync
      * getBuildStatusAsync
    to call apiv2 instead.
   */
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  Analytics.logEvent('Build Shell App', {
    projectRoot,
    developerTool: Config.developerTool,
    platform: options.platform,
  });

  _validateOptions(options);
  const { exp, configName, configPrefix } = await _getExpAsync(projectRoot, options);
  if (options.mode === 'create') {
    _validateManifest(options, exp, configName, configPrefix);
  }

  return await Api.callMethodAsync('build', [], 'put', { manifest: exp, options });
}

async function _waitForRunningAsync(
  projectRoot: string,
  url: string,
  retries: number = 300
): Promise<true> {
  try {
    let response = await axios.get(url, {
      responseType: 'text',
      proxy: false,
    });
    if (/packager-status:running/.test(response.data)) {
      return true;
    } else if (retries === 0) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Could not get status from Metro bundler. Server response: ${response.data}`
      );
    }
  } catch (e) {
    if (retries === 0) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Could not get status from Metro bundler. ${e.message}`
      );
    }
  }

  if (retries <= 0) {
    throw new Error('Connecting to Metro bundler failed.');
  } else {
    await delayAsync(100);
    return _waitForRunningAsync(projectRoot, url, retries - 1);
  }
}

// The --verbose flag is intended for react-native-cli/metro, not expo-cli
const METRO_VERBOSE_WARNING = 'Run CLI with --verbose flag for more details.';

// Remove these constants and related code when SDK35 isn't supported anymore
// Context: https://github.com/expo/expo-cli/issues/1074
const NODE_12_WINDOWS_METRO_ERROR = `Invalid regular expression: /(.*\\__fixtures__\\.*|node_modules[\\\]react[\\\]dist[\\\].*|website\\node_modules\\.*|heapCapture\\bundle\.js|.*\\__tests__\\.*)$/: Unterminated character class`;
const NODE_12_WINDOWS_METRO_SUGGESTION = `\nUnable to start the project due to a documented incompatibility between Node 12 LTS and Expo SDK 35 on Windows.
Please refer to this GitHub comment for a solution:
https://github.com/expo/expo-cli/issues/1074#issuecomment-559220752\n`;

function _logPackagerOutput(projectRoot: string, level: string, data: object) {
  let output = data.toString();
  if (!output) {
    return;
  }
  // Temporarily hide warnings about duplicate providesModule declarations
  // under react-native
  if (_isIgnorableDuplicateModuleWarning(projectRoot, level, output)) {
    ProjectUtils.logDebug(
      projectRoot,
      'expo',
      `Suppressing @providesModule warning: ${output}`,
      'project-suppress-providesmodule-warning'
    );
    return;
  }
  if (_isIgnorableMetroConsoleOutput(output) || _isIgnorableRnpmWarning(output)) {
    ProjectUtils.logDebug(projectRoot, 'expo', output);
    return;
  }

  if (output.includes(NODE_12_WINDOWS_METRO_ERROR)) {
    ProjectUtils.logError(projectRoot, 'expo', NODE_12_WINDOWS_METRO_SUGGESTION);
    return;
  }

  if (output.includes(METRO_VERBOSE_WARNING)) {
    output = output.replace(METRO_VERBOSE_WARNING, '');
  }

  if (/^Scanning folders for symlinks in /.test(output)) {
    ProjectUtils.logDebug(projectRoot, 'metro', output);
    return;
  }
  if (level === 'info') {
    ProjectUtils.logInfo(projectRoot, 'metro', output);
  } else {
    ProjectUtils.logError(projectRoot, 'metro', output);
  }
}

function _isIgnorableMetroConsoleOutput(output: string) {
  // As of React Native 0.61.x, Metro prints console logs from the device to console, without
  // passing them through the custom log reporter.
  //
  // Managed apps have a separate remote logging implementation included in the Expo SDK,
  // (see: _handleDeviceLogs), so we can just ignore these device logs from Metro.
  // if (/^ () /)
  //
  // These logs originate from:
  // https://github.com/facebook/metro/blob/e8181fb9db7db31adf7d1ed9ab840f54449ef238/packages/metro/src/lib/logToConsole.js#L50
  return /^\s+(INFO|WARN|LOG|GROUP|DEBUG) /.test(output);
}

function _isIgnorableRnpmWarning(output: string) {
  return output.startsWith(
    'warn The following packages use deprecated "rnpm" config that will stop working from next release'
  );
}

function _isIgnorableDuplicateModuleWarning(
  projectRoot: string,
  level: string,
  output: string
): boolean {
  if (
    level !== 'error' ||
    !output.startsWith('jest-haste-map: @providesModule naming collision:')
  ) {
    return false;
  }

  let reactNativeNodeModulesPath = path.join(
    projectRoot,
    'node_modules',
    'react-native',
    'node_modules'
  );
  let reactNativeNodeModulesPattern = escapeRegExp(reactNativeNodeModulesPath);
  let reactNativeNodeModulesCollisionRegex = new RegExp(
    `Paths: ${reactNativeNodeModulesPattern}.+ collides with ${reactNativeNodeModulesPattern}.+`
  );
  return reactNativeNodeModulesCollisionRegex.test(output);
}

function _isIgnorableBugReportingExtraData(body: any[]) {
  return body.length === 2 && body[0] === 'BugReporting extraData:';
}

function _isAppRegistryStartupMessage(body: any[]) {
  return (
    body.length === 1 &&
    (/^Running application "main" with appParams:/.test(body[0]) ||
      /^Running "main" with \{/.test(body[0]))
  );
}

type ConsoleLogLevel = 'info' | 'warn' | 'error' | 'debug';

function _handleDeviceLogs(projectRoot: string, deviceId: string, deviceName: string, logs: any) {
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    let body = typeof log.body === 'string' ? [log.body] : log.body;
    let { level } = log;

    if (_isIgnorableBugReportingExtraData(body)) {
      level = 'debug';
    }
    if (_isAppRegistryStartupMessage(body)) {
      body = [`Running application on ${deviceName}.`];
    }

    const args = body.map((obj: any) => {
      if (typeof obj === 'undefined') {
        return 'undefined';
      }
      if (obj === 'null') {
        return 'null';
      }
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
      }
      try {
        return JSON.stringify(obj);
      } catch (e) {
        return obj.toString();
      }
    });
    const logLevel =
      level === 'info' || level === 'warn' || level === 'error' || level === 'debug'
        ? (level as ConsoleLogLevel)
        : 'info';
    ProjectUtils.getLogger(projectRoot)[logLevel](
      {
        tag: 'device',
        deviceId,
        deviceName,
        groupDepth: log.groupDepth,
        shouldHide: log.shouldHide,
        includesStack: log.includesStack,
      },
      ...args
    );
  }
}
export async function startReactNativeServerAsync(
  projectRoot: string,
  options: StartOptions = {},
  verbose: boolean = true
): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  await stopReactNativeServerAsync(projectRoot);
  await Watchman.addToPathAsync(); // Attempt to fix watchman if it's hanging
  await Watchman.unblockAndGetVersionAsync(projectRoot);

  let { exp } = getConfig(projectRoot);

  let packagerPort = await _getFreePortAsync(19001); // Create packager options

  const customLogReporterPath: string = require.resolve(path.join(__dirname, 'reporter'));

  // TODO: Bacon: Support .mjs (short-lived JS modules extension that some packages use)
  const sourceExtsConfig = { isTS: true, isReact: true, isModern: false };
  const sourceExts =
    options.target === 'bare'
      ? getBareExtensions([], sourceExtsConfig)
      : getManagedExtensions([], sourceExtsConfig);

  let packagerOpts: { [key: string]: any } = {
    port: packagerPort,
    customLogReporterPath,
    sourceExts,
  };

  if (options.nonPersistent && Versions.lteSdkVersion(exp, '32.0.0')) {
    packagerOpts.nonPersistent = true;
  }

  if (Versions.gteSdkVersion(exp, '33.0.0')) {
    // starting with SDK 37, we bundle this plugin with the expo-asset package instead of expo,
    // so check there first and fall back to expo if we can't find it in expo-asset
    try {
      packagerOpts.assetPlugins = resolveModule(
        'expo-asset/tools/hashAssetFiles',
        projectRoot,
        exp
      );
    } catch (e) {
      packagerOpts.assetPlugins = resolveModule('expo/tools/hashAssetFiles', projectRoot, exp);
    }
  }

  if (options.maxWorkers) {
    packagerOpts['max-workers'] = options.maxWorkers;
  }

  if (!Versions.gteSdkVersion(exp, '16.0.0')) {
    delete packagerOpts.customLogReporterPath;
  }
  const userPackagerOpts = exp.packagerOpts;

  if (userPackagerOpts) {
    // The RN CLI expects rn-cli.config.js's path to be absolute. We use the
    // project root to resolve relative paths since that was the original
    // behavior of the RN CLI.
    if (userPackagerOpts.config) {
      userPackagerOpts.config = path.resolve(projectRoot, userPackagerOpts.config);
    }

    packagerOpts = {
      ...packagerOpts,
      ...userPackagerOpts,
      // In order to prevent people from forgetting to include the .expo extension or other things
      // NOTE(brentvatne): we should probably do away with packagerOpts soon in favor of @expo/metro-config!
      sourceExts: uniq([...packagerOpts.sourceExts, ...(userPackagerOpts.sourceExts ?? [])]),
    };

    if (userPackagerOpts.port !== undefined && userPackagerOpts.port !== null) {
      packagerPort = userPackagerOpts.port;
    }
  }
  let cliOpts = reduce(
    packagerOpts,
    (opts, val, key) => {
      // If the packager opt value is boolean, don't set
      // --[opt] [value], just set '--opt'
      if (val && typeof val === 'boolean') {
        opts.push(`--${key}`);
      } else if (val) {
        opts.push(`--${key}`, val);
      }
      return opts;
    },
    ['start']
  );

  if (process.env.EXPO_DEBUG) {
    cliOpts.push('--verbose');
  }

  if (options.reset) {
    cliOpts.push('--reset-cache');
  } // Get custom CLI path from project package.json, but fall back to node_module path
  let defaultCliPath = resolveModule('react-native/local-cli/cli.js', projectRoot, exp);
  const cliPath = exp.rnCliPath || defaultCliPath;
  let nodePath;
  // When using a custom path for the RN CLI, we want it to use the project
  // root to look up config files and Node modules
  if (exp.rnCliPath) {
    nodePath = _nodePathForProjectRoot(projectRoot);
  } else {
    nodePath = null;
  }
  // Run the copy of Node that's embedded in Electron by setting the
  // ELECTRON_RUN_AS_NODE environment variable
  // Note: the CLI script sets up graceful-fs and sets ulimit to 4096 in the
  // child process
  const nodePathEnv = nodePath ? { NODE_PATH: nodePath } : {};
  let packagerProcess = child_process.fork(cliPath, cliOpts, {
    cwd: projectRoot,
    env: {
      ...process.env,
      REACT_NATIVE_APP_ROOT: projectRoot,
      ELECTRON_RUN_AS_NODE: '1',
      ...nodePathEnv,
    },
    silent: true,
  });
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    packagerPort,
    packagerPid: packagerProcess.pid,
  }); // TODO: do we need this? don't know if it's ever called
  process.on('exit', () => {
    treekill(packagerProcess.pid);
  });
  if (!packagerProcess.stdout) {
    throw new Error('Expected spawned process to have a stdout stream, but none was found.');
  }
  if (!packagerProcess.stderr) {
    throw new Error('Expected spawned process to have a stderr stream, but none was found.');
  }
  packagerProcess.stdout.setEncoding('utf8');
  packagerProcess.stderr.setEncoding('utf8');
  packagerProcess.stdout.pipe(split()).on('data', data => {
    if (verbose) {
      _logPackagerOutput(projectRoot, 'info', data);
    }
  });
  packagerProcess.stderr.on('data', data => {
    if (verbose) {
      _logPackagerOutput(projectRoot, 'error', data);
    }
  });
  let exitPromise = new Promise((resolve, reject) => {
    packagerProcess.once('exit', async code => {
      ProjectUtils.logDebug(projectRoot, 'expo', `Metro Bundler process exited with code ${code}`);
      if (code) {
        reject(new Error(`Metro Bundler process exited with code ${code}`));
      } else {
        resolve();
      }
      try {
        await ProjectSettings.setPackagerInfoAsync(projectRoot, {
          packagerPort: null,
          packagerPid: null,
        });
      } catch (e) {}
    });
  });
  let packagerUrl = await UrlUtils.constructBundleUrlAsync(projectRoot, {
    urlType: 'http',
    hostType: 'localhost',
  });
  await Promise.race([_waitForRunningAsync(projectRoot, `${packagerUrl}/status`), exitPromise]);
}

// Simulate the node_modules resolution
// If you project dir is /Jesse/Expo/Universe/BubbleBounce, returns
// "/Jesse/node_modules:/Jesse/Expo/node_modules:/Jesse/Expo/Universe/node_modules:/Jesse/Expo/Universe/BubbleBounce/node_modules"
function _nodePathForProjectRoot(projectRoot: string): string {
  let paths = [];
  let directory = path.resolve(projectRoot);
  while (true) {
    paths.push(path.join(directory, 'node_modules'));
    let parentDirectory = path.dirname(directory);
    if (directory === parentDirectory) {
      break;
    }
    directory = parentDirectory;
  }
  return paths.join(path.delimiter);
}
export async function stopReactNativeServerAsync(projectRoot: string): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort || !packagerInfo.packagerPid) {
    ProjectUtils.logDebug(projectRoot, 'expo', `No packager found for project at ${projectRoot}.`);
    return;
  }
  ProjectUtils.logDebug(
    projectRoot,
    'expo',
    `Killing packager process tree: ${packagerInfo.packagerPid}`
  );
  try {
    await treekillAsync(packagerInfo.packagerPid, 'SIGKILL');
  } catch (e) {
    ProjectUtils.logDebug(projectRoot, 'expo', `Error stopping packager process: ${e.toString()}`);
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    packagerPort: null,
    packagerPid: null,
  });
}

let blacklistedEnvironmentVariables = new Set([
  'EXPO_APPLE_PASSWORD',
  'EXPO_ANDROID_KEY_PASSWORD',
  'EXPO_ANDROID_KEYSTORE_PASSWORD',
  'EXPO_IOS_DIST_P12_PASSWORD',
  'EXPO_IOS_PUSH_P12_PASSWORD',
  'EXPO_CLI_PASSWORD',
]);

function shouldExposeEnvironmentVariableInManifest(key: string) {
  if (blacklistedEnvironmentVariables.has(key.toUpperCase())) {
    return false;
  }
  return key.startsWith('REACT_NATIVE_') || key.startsWith('EXPO_');
}

function stripPort(host: string | undefined): string | undefined {
  if (!host) {
    return host;
  }
  return new URL('/', `http://${host}`).hostname;
}

function getManifestHandler(projectRoot: string) {
  return async (
    req: express.Request | http.IncomingMessage,
    res: express.Response | http.ServerResponse
  ) => {
    try {
      // We intentionally don't `await`. We want to continue trying even
      // if there is a potential error in the package.json and don't want to slow
      // down the request
      Doctor.validateWithNetworkAsync(projectRoot);
      // Get packager opts and then copy into bundleUrlPackagerOpts
      let packagerOpts = await ProjectSettings.readAsync(projectRoot);
      let { exp: manifest } = getConfig(projectRoot);
      let bundleUrlPackagerOpts = JSON.parse(JSON.stringify(packagerOpts));
      bundleUrlPackagerOpts.urlType = 'http';
      if (bundleUrlPackagerOpts.hostType === 'redirect') {
        bundleUrlPackagerOpts.hostType = 'tunnel';
      }
      manifest.xde = true; // deprecated
      manifest.developer = {
        tool: Config.developerTool,
        projectRoot,
      };
      manifest.packagerOpts = packagerOpts;
      manifest.env = {};
      for (let key of Object.keys(process.env)) {
        if (shouldExposeEnvironmentVariableInManifest(key)) {
          manifest.env[key] = process.env[key];
        }
      }
      let platform = (req.headers['exponent-platform'] || 'ios').toString();
      let entryPoint = Exp.determineEntryPoint(projectRoot, platform);
      let mainModuleName = UrlUtils.guessMainModulePath(entryPoint);
      let queryParams = await UrlUtils.constructBundleQueryParamsAsync(projectRoot, packagerOpts);
      let path = `/${encodeURI(mainModuleName)}.bundle?platform=${encodeURIComponent(
        platform
      )}&${queryParams}`;
      const hostname = stripPort(req.headers.host);
      manifest.bundleUrl =
        (await UrlUtils.constructBundleUrlAsync(projectRoot, bundleUrlPackagerOpts, hostname)) +
        path;
      manifest.debuggerHost = await UrlUtils.constructDebuggerHostAsync(projectRoot, hostname);
      manifest.mainModuleName = mainModuleName;
      manifest.logUrl = await UrlUtils.constructLogUrlAsync(projectRoot, hostname);
      manifest.hostUri = await UrlUtils.constructHostUriAsync(projectRoot, hostname);
      await _resolveManifestAssets(
        projectRoot,
        manifest as PublicConfig,
        async path => manifest.bundleUrl.match(/^https?:\/\/.*?\//)[0] + 'assets/' + path
      ); // the server normally inserts this but if we're offline we'll do it here
      await _resolveGoogleServicesFile(projectRoot, manifest);
      const hostUUID = await UserSettings.anonymousIdentifier();
      let currentSession = await UserManager.getSessionAsync();
      if (!currentSession || Config.offline) {
        manifest.id = `@${ANONYMOUS_USERNAME}/${manifest.slug}-${hostUUID}`;
      }
      let manifestString = JSON.stringify(manifest);
      if (req.headers['exponent-accept-signature']) {
        if (_cachedSignedManifest.manifestString === manifestString) {
          manifestString = _cachedSignedManifest.signedManifest;
        } else {
          if (!currentSession || Config.offline) {
            const unsignedManifest = {
              manifestString,
              signature: 'UNSIGNED',
            };
            _cachedSignedManifest.manifestString = manifestString;
            manifestString = JSON.stringify(unsignedManifest);
            _cachedSignedManifest.signedManifest = manifestString;
          } else {
            let publishInfo = await Exp.getPublishInfoAsync(projectRoot);

            let signedManifest;
            if (process.env.EXPO_LEGACY_API === 'true') {
              signedManifest = await Api.callMethodAsync(
                'signManifest',
                [publishInfo.args],
                'post',
                manifest
              );
            } else {
              const user = await UserManager.ensureLoggedInAsync();
              const api = ApiV2.clientForUser(user);
              signedManifest = await api.postAsync('manifest/sign', {
                args: publishInfo.args,
                manifest,
              });
            }
            _cachedSignedManifest.manifestString = manifestString;
            _cachedSignedManifest.signedManifest = signedManifest.response;
            manifestString = signedManifest.response;
          }
        }
      }
      const hostInfo = {
        host: hostUUID,
        server: 'xdl',
        serverVersion: require('@expo/xdl/package.json').version,
        serverDriver: Config.developerTool,
        serverOS: os.platform(),
        serverOSVersion: os.release(),
      };
      res.setHeader('Exponent-Server', JSON.stringify(hostInfo));
      res.end(manifestString);
      Analytics.logEvent('Serve Manifest', {
        projectRoot,
        developerTool: Config.developerTool,
      });
    } catch (e) {
      ProjectUtils.logError(projectRoot, 'expo', e.stack);
      // 5xx = Server Error HTTP code
      res.statusCode = 520;
      res.end(
        JSON.stringify({
          error: e.toString(),
        })
      );
    }
  };
}

export async function startExpoServerAsync(projectRoot: string): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  await stopExpoServerAsync(projectRoot);
  let app = express();
  app.use(
    express.json({
      limit: '10mb',
    })
  );
  app.use(
    express.urlencoded({
      limit: '10mb',
      extended: true,
    })
  );
  if (
    (ConnectionStatus.isOffline()
      ? await Doctor.validateWithoutNetworkAsync(projectRoot)
      : await Doctor.validateWithNetworkAsync(projectRoot)) === Doctor.FATAL
  ) {
    throw new Error(`Couldn't start project. Please fix the errors and restart the project.`);
  }
  // Serve the manifest.
  const manifestHandler = getManifestHandler(projectRoot);
  app.get('/', manifestHandler);
  app.get('/manifest', manifestHandler);
  app.get('/index.exp', manifestHandler);
  app.post('/logs', async (req, res) => {
    try {
      let deviceId = req.get('Device-Id');
      let deviceName = req.get('Device-Name');
      if (deviceId && deviceName && req.body) {
        _handleDeviceLogs(projectRoot, deviceId, deviceName, req.body);
      }
    } catch (e) {
      ProjectUtils.logError(projectRoot, 'expo', `Error getting device logs: ${e} ${e.stack}`);
    }
    res.send('Success');
  });
  app.post('/shutdown', async (req, res) => {
    server.close();
    res.send('Success');
  });
  let expRc = await readExpRcAsync(projectRoot);
  let expoServerPort = expRc.manifestPort ? expRc.manifestPort : await _getFreePortAsync(19000);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort,
  });
  let server = app.listen(expoServerPort, () => {
    const info = server.address() as AddressInfo;
    const host = info.address;
    const port = info.port;
    ProjectUtils.logDebug(projectRoot, 'expo', `Local server listening at http://${host}:${port}`);
  });
  await Exp.saveRecentExpRootAsync(projectRoot);
}

export async function stopExpoServerAsync(projectRoot: string): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (packagerInfo && packagerInfo.expoServerPort) {
    try {
      await axios.post(`http://127.0.0.1:${packagerInfo.expoServerPort}/shutdown`);
    } catch (e) {}
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: null,
  });
}

async function startDevServerAsync(projectRoot: string, startOptions: StartOptions) {
  _assertValidProjectRoot(projectRoot);

  const port = await _getFreePortAsync(19000); // Create packager options
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: port,
    packagerPort: port,
  });

  const options: MetroDevServerOptions = {
    port,
    logger: ProjectUtils.getLogger(projectRoot),
  };
  if (startOptions.reset) {
    options.resetCache = true;
  }
  if (startOptions.maxWorkers != null) {
    options.maxWorkers = startOptions.maxWorkers;
  }
  if (startOptions.target) {
    // EXPO_TARGET is used by @expo/metro-config to determine the target when getDefaultConfig is
    // called from metro.config.js and the --target option is used to override the default target.
    process.env.EXPO_TARGET = options.target;
  }
  const { middleware } = await runMetroDevServerAsync(projectRoot, options);
  middleware.use(getManifestHandler(projectRoot));
}

async function _connectToNgrokAsync(
  projectRoot: string,
  args: ngrok.NgrokOptions,
  hostnameAsync: () => Promise<string>,
  ngrokPid: number | null | undefined,
  attempts: number = 0
): Promise<string> {
  try {
    const configPath = path.join(UserSettings.dotExpoHomeDirectory(), 'ngrok.yml');
    const hostname = await hostnameAsync();
    const url = await ngrokConnectAsync({
      hostname,
      configPath,
      ...args,
    });
    return url;
  } catch (e) {
    // Attempt to connect 3 times
    if (attempts >= 2) {
      if (e.message) {
        throw new XDLError('NGROK_ERROR', e.toString());
      } else {
        throw new XDLError('NGROK_ERROR', JSON.stringify(e));
      }
    }
    if (!attempts) {
      attempts = 0;
    } // Attempt to fix the issue
    if (e.error_code && e.error_code === 103) {
      if (attempts === 0) {
        // Failed to start tunnel. Might be because url already bound to another session.
        if (ngrokPid) {
          try {
            process.kill(ngrokPid, 'SIGKILL');
          } catch (e) {
            ProjectUtils.logDebug(projectRoot, 'expo', `Couldn't kill ngrok with PID ${ngrokPid}`);
          }
        } else {
          await ngrokKillAsync();
        }
      } else {
        // Change randomness to avoid conflict if killing ngrok didn't help
        await Exp.resetProjectRandomnessAsync(projectRoot);
      }
    } // Wait 100ms and then try again
    await delayAsync(100);
    return _connectToNgrokAsync(projectRoot, args, hostnameAsync, null, attempts + 1);
  }
}

export async function startTunnelsAsync(projectRoot: string): Promise<void> {
  const username = (await UserManager.getCurrentUsernameAsync()) || ANONYMOUS_USERNAME;
  _assertValidProjectRoot(projectRoot);
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort) {
    throw new XDLError('NO_PACKAGER_PORT', `No packager found for project at ${projectRoot}.`);
  }
  if (!packagerInfo.expoServerPort) {
    throw new XDLError(
      'NO_EXPO_SERVER_PORT',
      `No Expo server found for project at ${projectRoot}.`
    );
  }
  const expoServerPort = packagerInfo.expoServerPort;
  await stopTunnelsAsync(projectRoot);
  if (await Android.startAdbReverseAsync(projectRoot)) {
    ProjectUtils.logInfo(
      projectRoot,
      'expo',
      'Successfully ran `adb reverse`. Localhost URLs should work on the connected Android device.'
    );
  }
  let packageShortName = path.parse(projectRoot).base;
  let expRc = await readExpRcAsync(projectRoot);

  let startedTunnelsSuccessfully = false;

  // Some issues with ngrok cause it to hang indefinitely. After
  // TUNNEL_TIMEOUTms we just throw an error.
  await Promise.race([
    (async () => {
      await delayAsync(TUNNEL_TIMEOUT);
      if (!startedTunnelsSuccessfully) {
        throw new Error('Starting tunnels timed out');
      }
    })(),
    (async () => {
      let expoServerNgrokUrl = await _connectToNgrokAsync(
        projectRoot,
        {
          authtoken: Config.ngrok.authToken,
          port: expoServerPort,
          proto: 'http',
        },
        async () => {
          let randomness = expRc.manifestTunnelRandomness
            ? expRc.manifestTunnelRandomness
            : await Exp.getProjectRandomnessAsync(projectRoot);
          return [
            randomness,
            UrlUtils.domainify(username),
            UrlUtils.domainify(packageShortName),
            Config.ngrok.domain,
          ].join('.');
        },
        packagerInfo.ngrokPid
      );
      let packagerNgrokUrl = await _connectToNgrokAsync(
        projectRoot,
        {
          authtoken: Config.ngrok.authToken,
          port: packagerInfo.packagerPort,
          proto: 'http',
        },
        async () => {
          let randomness = expRc.manifestTunnelRandomness
            ? expRc.manifestTunnelRandomness
            : await Exp.getProjectRandomnessAsync(projectRoot);
          return [
            'packager',
            randomness,
            UrlUtils.domainify(username),
            UrlUtils.domainify(packageShortName),
            Config.ngrok.domain,
          ].join('.');
        },
        packagerInfo.ngrokPid
      );
      await ProjectSettings.setPackagerInfoAsync(projectRoot, {
        expoServerNgrokUrl,
        packagerNgrokUrl,
        ngrokPid: ngrok.process().pid,
      });

      startedTunnelsSuccessfully = true;

      ProjectUtils.logWithLevel(
        projectRoot,
        'info',
        {
          tag: 'expo',
          _expoEventType: 'TUNNEL_READY',
        },
        'Tunnel ready.'
      );

      ngrok.addListener('statuschange', (status: string) => {
        if (status === 'reconnecting') {
          ProjectUtils.logError(
            projectRoot,
            'expo',
            'We noticed your tunnel is having issues. ' +
              'This may be due to intermittent problems with our tunnel provider. ' +
              'If you have trouble connecting to your app, try to Restart the project, ' +
              'or switch Host to LAN.'
          );
        } else if (status === 'online') {
          ProjectUtils.logInfo(projectRoot, 'expo', 'Tunnel connected.');
        }
      });
    })(),
  ]);
}

export async function stopTunnelsAsync(projectRoot: string): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  // This will kill all ngrok tunnels in the process.
  // We'll need to change this if we ever support more than one project
  // open at a time in XDE.
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  let ngrokProcess = ngrok.process();
  let ngrokProcessPid = ngrokProcess ? ngrokProcess.pid : null;
  ngrok.removeAllListeners('statuschange');
  if (packagerInfo.ngrokPid && packagerInfo.ngrokPid !== ngrokProcessPid) {
    // Ngrok is running in some other process. Kill at the os level.
    try {
      process.kill(packagerInfo.ngrokPid);
    } catch (e) {
      ProjectUtils.logDebug(
        projectRoot,
        'expo',
        `Couldn't kill ngrok with PID ${packagerInfo.ngrokPid}`
      );
    }
  } else {
    // Ngrok is running from the current process. Kill using ngrok api.
    await ngrokKillAsync();
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerNgrokUrl: null,
    packagerNgrokUrl: null,
    ngrokPid: null,
  });
  await Android.stopAdbReverseAsync(projectRoot);
}

export async function setOptionsAsync(
  projectRoot: string,
  options: {
    packagerPort?: number;
  }
): Promise<void> {
  _assertValidProjectRoot(projectRoot); // Check to make sure all options are valid
  let schema = joi.object().keys({
    packagerPort: joi.number().integer(),
  });
  const { error } = joi.validate(options, schema);
  if (error) {
    throw new XDLError('INVALID_OPTIONS', error.toString());
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, options);
}

// DEPRECATED(2019-08-21): use UrlUtils.constructManifestUrlAsync
export async function getUrlAsync(projectRoot: string, options: object = {}): Promise<string> {
  _assertValidProjectRoot(projectRoot);
  return await UrlUtils.constructManifestUrlAsync(projectRoot, options);
}

export async function startAsync(
  projectRoot: string,
  options: StartOptions = {},
  verbose: boolean = true
): Promise<ExpoConfig> {
  _assertValidProjectRoot(projectRoot);
  Analytics.logEvent('Start Project', {
    projectRoot,
    developerTool: Config.developerTool,
  });

  let { exp } = getConfig(projectRoot);
  if (options.webOnly) {
    await Webpack.restartAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'web');
    return exp;
  } else if (getenv.boolish('EXPO_USE_DEV_SERVER', false)) {
    await startDevServerAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'native');
  } else {
    await startExpoServerAsync(projectRoot);
    await startReactNativeServerAsync(projectRoot, options, verbose);
    DevSession.startSession(projectRoot, exp, 'native');
  }

  const { hostType } = await ProjectSettings.readAsync(projectRoot);

  if (!Config.offline && hostType === 'tunnel') {
    try {
      await startTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error starting tunnel ${e.message}`);
    }
  }
  return exp;
}

async function _stopInternalAsync(projectRoot: string): Promise<void> {
  DevSession.stopSession();
  await Webpack.stopAsync(projectRoot);
  ProjectUtils.logInfo(projectRoot, 'expo', '\u203A Closing Expo server');
  await stopExpoServerAsync(projectRoot);
  ProjectUtils.logInfo(projectRoot, 'expo', '\u203A Stopping Metro bundler');
  await stopReactNativeServerAsync(projectRoot);
  await Android.maybeStopAdbDaemonAsync();
  if (!Config.offline) {
    try {
      await stopTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error stopping ngrok ${e.message}`);
    }
  }
}

export async function stopWebOnlyAsync(projectDir: string): Promise<void> {
  await Webpack.stopAsync(projectDir);
  await DevSession.stopSession();
}

export async function stopAsync(projectDir: string): Promise<void> {
  const result = await Promise.race([
    _stopInternalAsync(projectDir),
    new Promise(resolve => setTimeout(resolve, 2000, 'stopFailed')),
  ]);
  if (result === 'stopFailed') {
    // find RN packager and ngrok pids, attempt to kill them manually
    const { packagerPid, ngrokPid } = await ProjectSettings.readPackagerInfoAsync(projectDir);
    if (packagerPid) {
      try {
        process.kill(packagerPid);
      } catch (e) {}
    }
    if (ngrokPid) {
      try {
        process.kill(ngrokPid);
      } catch (e) {}
    }
    await ProjectSettings.setPackagerInfoAsync(projectDir, {
      expoServerPort: null,
      packagerPort: null,
      packagerPid: null,
      expoServerNgrokUrl: null,
      packagerNgrokUrl: null,
      ngrokPid: null,
      webpackServerPort: null,
    });
  }
}
