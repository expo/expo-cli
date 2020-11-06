import {
  configFilename,
  ExpoAppManifest,
  ExpoConfig,
  getConfig,
  getDefaultTarget,
  getPublicExpoConfig,
  Hook,
  HookArguments,
  HookType,
  PackageJSONConfig,
  Platform,
  ProjectTarget,
  readExpRcAsync,
  resolveModule,
} from '@expo/config';
import { getBareExtensions, getManagedExtensions } from '@expo/config/paths';
import { bundleAsync, MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';
import JsonFile from '@expo/json-file';
import ngrok from '@expo/ngrok';
import joi from '@hapi/joi';
import axios from 'axios';
import chalk from 'chalk';
import child_process from 'child_process';
import crypto from 'crypto';
import decache from 'decache';
import delayAsync from 'delay-async';
import express from 'express';
import freeportAsync from 'freeport-async';
import fs from 'fs-extra';
import getenv from 'getenv';
import HashIds from 'hashids';
import escapeRegExp from 'lodash/escapeRegExp';
import { AddressInfo } from 'net';
import path from 'path';
import readLastLines from 'read-last-lines';
import semver from 'semver';
import slug from 'slugify';
import split from 'split';
import terminalLink from 'terminal-link';
import treekill from 'tree-kill';
import urljoin from 'url-join';
import { promisify } from 'util';
import uuid from 'uuid';

import Analytics from './Analytics';
import * as Android from './Android';
import ApiV2 from './ApiV2';
import Config from './Config';
import * as ConnectionStatus from './ConnectionStatus';
import * as DevSession from './DevSession';
import * as EmbeddedAssets from './EmbeddedAssets';
import { maySkipManifestValidation } from './Env';
import { ErrorCode } from './ErrorCode';
import * as Exp from './Exp';
import logger from './Logger';
import { Asset, exportAssetsAsync, publishAssetsAsync } from './ProjectAssets';
import * as ProjectSettings from './ProjectSettings';
import * as Sentry from './Sentry';
import * as ThirdParty from './ThirdParty';
import * as UrlUtils from './UrlUtils';
import UserManager, { ANONYMOUS_USERNAME, User } from './User';
import UserSettings from './UserSettings';
import * as Versions from './Versions';
import * as Watchman from './Watchman';
import * as Webpack from './Webpack';
import XDLError from './XDLError';
import * as ExponentTools from './detach/ExponentTools';
import * as TableText from './logs/TableText';
import * as Doctor from './project/Doctor';
import { getManifestHandler } from './project/ManifestHandler';
import * as ProjectUtils from './project/ProjectUtils';
import { writeArtifactSafelyAsync } from './tools/ArtifactUtils';
import FormData from './tools/FormData';

const MINIMUM_BUNDLE_SIZE = 500;
const TUNNEL_TIMEOUT = 10 * 1000;

const treekillAsync = promisify<number, string>(treekill);
const ngrokConnectAsync = promisify(ngrok.connect);
const ngrokKillAsync = promisify(ngrok.kill);

type SelfHostedIndex = ExpoAppManifest & {
  dependencies: string[];
};

type LoadedHook = Hook & {
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
  resetCache?: boolean;
  maxWorkers?: number;
  quiet?: boolean;
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

type ProjectStatus = 'running' | 'ill' | 'exited';

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

async function _assertValidProjectRoot(projectRoot: string) {
  if (!projectRoot) {
    throw new XDLError('NO_PROJECT_ROOT', 'No project root specified');
  }
}

async function _getFreePortAsync(rangeStart: number) {
  const port = await freeportAsync(rangeStart, { hostnames: [null, 'localhost'] });
  if (!port) {
    throw new XDLError('NO_PORT_FOUND', 'No available port found');
  }

  return port;
}

function _requireFromProject(modulePath: string, projectRoot: string, exp: ExpoConfig) {
  try {
    const fullPath = resolveModule(modulePath, projectRoot, exp);
    // Clear the require cache for this module so get a fresh version of it
    // without requiring the user to restart Expo CLI
    decache(fullPath);
    // $FlowIssue: doesn't work with dynamic requires
    return require(fullPath);
  } catch (e) {
    return null;
  }
}

export async function getLatestReleaseAsync(
  projectRoot: string,
  options: {
    releaseChannel: string;
    platform: string;
    owner?: string;
  }
): Promise<Release | null> {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2.clientForUser(user);
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const result = await api.postAsync('publish/history', {
    owner: options.owner,
    slug: exp.slug,
    releaseChannel: options.releaseChannel,
    count: 1,
    platform: options.platform,
  });
  const { queryResult } = result;
  if (queryResult && queryResult.length > 0) {
    return queryResult[0];
  } else {
    return null;
  }
}

function isSelfHostedIndex(obj: any): obj is SelfHostedIndex {
  return !!obj.sdkVersion;
}

// Takes multiple exported apps in sourceDirs and coalesces them to one app in outputDir
export async function mergeAppDistributions(
  projectRoot: string,
  sourceDirs: string[],
  outputDir: string
): Promise<void> {
  const assetPathToWrite = path.resolve(projectRoot, outputDir, 'assets');
  await fs.ensureDir(assetPathToWrite);
  const bundlesPathToWrite = path.resolve(projectRoot, outputDir, 'bundles');
  await fs.ensureDir(bundlesPathToWrite);

  // merge files from bundles and assets
  const androidIndexes: SelfHostedIndex[] = [];
  const iosIndexes: SelfHostedIndex[] = [];

  for (const sourceDir of sourceDirs) {
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
      const index = await JsonFile.readAsync(indexPath);

      if (!isSelfHostedIndex(index)) {
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

function prepareHooks(
  hooks: ExpoConfig['hooks'],
  hookType: HookType,
  projectRoot: string,
  exp: ExpoConfig
) {
  const validHooks: LoadedHook[] = [];

  if (hooks) {
    if (hooks[hookType]) {
      hooks[hookType]!.forEach((hook: any) => {
        const { file } = hook;
        const fn = _requireFromProject(file, projectRoot, exp);
        if (typeof fn !== 'function') {
          logger.global.error(
            `Unable to load ${hookType} hook: '${file}'. The module does not export a function.`
          );
        } else {
          hook._fn = fn;
          validHooks.push(hook);
        }
      });
    }

    if (hooks[hookType] !== undefined && validHooks.length !== hooks[hookType]?.length) {
      throw new XDLError(
        'HOOK_INITIALIZATION_ERROR',
        `Please fix your ${hookType} hook configuration`
      );
    }
  }

  return validHooks;
}

export async function runHook(hook: LoadedHook, hookOptions: Omit<HookArguments, 'config'>) {
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
  const defaultTarget = getDefaultTarget(projectRoot);
  const target = options.publishOptions?.target ?? defaultTarget;

  // build the bundles
  // make output dirs if not exists
  const assetPathToWrite = path.resolve(projectRoot, path.join(outputDir, 'assets'));
  await fs.ensureDir(assetPathToWrite);
  const bundlesPathToWrite = path.resolve(projectRoot, path.join(outputDir, 'bundles'));
  await fs.ensureDir(bundlesPathToWrite);

  const bundles = await buildPublishBundlesAsync(projectRoot, options.publishOptions, {
    dev: options.isDev,
  });
  const iosBundle = bundles.ios.code;
  const androidBundle = bundles.android.code;

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
  const { exp, pkg, hooks } = await _getPublishExpConfigAsync(projectRoot, publishOptions);
  const { assets } = await exportAssetsAsync({
    projectRoot,
    exp,
    hostedUrl: publicUrl,
    assetPath: 'assets',
    outputDir,
    bundles,
  });

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
  const validPostExportHooks: LoadedHook[] = prepareHooks(hooks, 'postExport', projectRoot, exp);

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

  const iosSourceMap = bundles.ios.map;
  const androidSourceMap = bundles.android.map;

  // build source maps
  if (options.dumpSourcemap) {
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

  const hookOptions = {
    url: null,
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

  for (const hook of validPostExportHooks) {
    logger.global.info(`Running postExport hook: ${hook.file}`);

    try {
      runHook(hook, hookOptions);
    } catch (e) {
      logger.global.warn(`Warning: postExport hook '${hook.file}' failed: ${e.stack}`);
    }
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

export async function findReusableBuildAsync(
  releaseChannel: string,
  platform: string,
  sdkVersion: string,
  slug: string,
  owner?: string
): Promise<{ downloadUrl?: string; canReuse: boolean }> {
  const user = await UserManager.getCurrentUserAsync();

  const buildReuseStatus = await ApiV2.clientForUser(user).postAsync('standalone-build/reuse', {
    releaseChannel,
    platform,
    sdkVersion,
    slug,
    owner,
  });

  return buildReuseStatus;
}

export interface PublishedProjectResult {
  /**
   * Project manifest URL
   */
  url: string;
  /**
   * TODO: What is this?
   */
  ids: string[];
  /**
   * TODO: What is this? Where does it come from?
   */
  err?: string;
}

export async function publishAsync(
  projectRoot: string,
  options: PublishOptions = {}
): Promise<PublishedProjectResult> {
  options.target = options.target ?? getDefaultTarget(projectRoot);
  const target = options.target;
  const user = await UserManager.ensureLoggedInAsync();

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
  const { exp, pkg, hooks } = await _getPublishExpConfigAsync(projectRoot, options);

  // TODO: refactor this out to a function, throw error if length doesn't match
  const validPostPublishHooks: LoadedHook[] = prepareHooks(hooks, 'postPublish', projectRoot, exp);
  const bundles = await buildPublishBundlesAsync(projectRoot, options);
  const androidBundle = bundles.android.code;
  const iosBundle = bundles.ios.code;

  const files = [
    ['index.ios.js', bundles.ios.code],
    ['index.android.js', bundles.android.code],
  ];
  // Account for inline source maps
  if (bundles.ios.map) {
    files.push([chalk.dim('index.ios.js.map'), bundles.ios.map]);
  }
  if (bundles.android.map) {
    files.push([chalk.dim('index.android.js.map'), bundles.android.map]);
  }

  logger.global.info('');
  logger.global.info(TableText.createFilesTable(files));
  logger.global.info('');
  logger.global.info(
    terminalLink(
      'Learn more about JavaScript bundle sizes',
      `https://expo.fyi/javascript-bundle-sizes`,
      { fallback: (text, url) => `${text}: ${url}` }
    )
  );
  logger.global.info('');

  await publishAssetsAsync({ projectRoot, exp, bundles });

  const hasHooks = validPostPublishHooks.length > 0;

  const shouldPublishAndroidMaps = !!exp.android && !!exp.android.publishSourceMapPath;
  const shouldPublishIosMaps = !!exp.ios && !!exp.ios.publishSourceMapPath;
  const androidSourceMap = hasHooks || shouldPublishAndroidMaps ? bundles.android.map : null;
  const iosSourceMap = hasHooks || shouldPublishIosMaps ? bundles.ios.map : null;

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

    for (const hook of validPostPublishHooks) {
      logger.global.info(`Running postPublish hook: ${hook.file}`);
      try {
        runHook(hook, hookOptions);
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
  logger.global.info('');
  logger.global.info('Uploading JavaScript bundles');
  const formData = new FormData();

  formData.append('expJson', JSON.stringify(exp));
  formData.append('packageJson', JSON.stringify(pkg));
  formData.append('iosBundle', iosBundle, 'iosBundle');
  formData.append('androidBundle', androidBundle, 'androidBundle');
  formData.append('options', JSON.stringify(options));

  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2.clientForUser(user);

  return await api.uploadFormDataAsync('publish/new', formData);
}

async function _getPublishExpConfigAsync(
  projectRoot: string,
  options: PublishOptions
): Promise<{
  exp: ExpoAppManifest;
  pkg: PackageJSONConfig;
  hooks: ExpoConfig['hooks'];
}> {
  if (options.releaseChannel != null && typeof options.releaseChannel !== 'string') {
    throw new XDLError('INVALID_OPTIONS', 'releaseChannel must be a string');
  }
  options.releaseChannel = options.releaseChannel || 'default';

  // Verify that exp/app.json and package.json exist
  const { exp: privateExp, pkg } = getConfig(projectRoot);
  const { hooks } = privateExp;

  const exp = getPublicExpoConfig(projectRoot);

  const { sdkVersion } = exp;

  // Only allow projects to be published with UNVERSIONED if a correct token is set in env
  if (sdkVersion === 'UNVERSIONED' && !maySkipManifestValidation()) {
    throw new XDLError('INVALID_OPTIONS', 'Cannot publish with sdkVersion UNVERSIONED.');
  }
  exp.locales = await ExponentTools.getResolvedLocalesAsync(projectRoot, exp);
  return {
    exp: {
      ...exp,
      sdkVersion: sdkVersion!,
    },
    pkg,
    hooks,
  };
}

async function buildPublishBundlesAsync(
  projectRoot: string,
  publishOptions: PublishOptions = {},
  bundleOptions: { dev?: boolean } = {}
) {
  if (!getenv.boolish('EXPO_USE_DEV_SERVER', false)) {
    try {
      await startReactNativeServerAsync({
        projectRoot,
        options: {
          nonPersistent: true,
          maxWorkers: publishOptions.maxWorkers,
          target: publishOptions.target,
          reset: publishOptions.resetCache,
        },
        verbose: !publishOptions.quiet,
      });
      return await fetchPublishBundlesAsync(projectRoot);
    } finally {
      await stopReactNativeServerAsync(projectRoot);
    }
  }

  const platforms: Platform[] = ['android', 'ios'];
  const [android, ios] = await bundleAsync(
    projectRoot,
    {
      target: publishOptions.target,
      resetCache: publishOptions.resetCache,
      logger: ProjectUtils.getLogger(projectRoot),
      quiet: publishOptions.quiet,
    },
    platforms.map((platform: Platform) => ({
      platform,
      entryPoint: Exp.determineEntryPoint(projectRoot, platform),
      dev: bundleOptions.dev,
    }))
  );

  return {
    android,
    ios,
  };
}

// Fetch iOS and Android bundles for publishing
async function fetchPublishBundlesAsync(projectRoot: string, opts?: PackagerOptions) {
  const entryPoint = Exp.determineEntryPoint(projectRoot);
  const publishUrl = await UrlUtils.constructPublishUrlAsync(
    projectRoot,
    entryPoint,
    undefined,
    opts
  );
  const sourceMapUrl = await UrlUtils.constructSourceMapUrlAsync(projectRoot, entryPoint);
  const assetsUrl = await UrlUtils.constructAssetsUrlAsync(projectRoot, entryPoint);

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

  logger.global.info('Building source maps');
  const iosSourceMap = await _getForPlatformAsync(projectRoot, sourceMapUrl, 'ios', {
    errorCode: 'INVALID_BUNDLE',
    minLength: MINIMUM_BUNDLE_SIZE,
  });
  const androidSourceMap = await _getForPlatformAsync(projectRoot, sourceMapUrl, 'android', {
    errorCode: 'INVALID_BUNDLE',
    minLength: MINIMUM_BUNDLE_SIZE,
  });

  logger.global.info('Building asset maps');
  const iosAssetsJson = await _getForPlatformAsync(projectRoot, assetsUrl, 'ios', {
    errorCode: 'INVALID_ASSETS',
  });
  const androidAssetsJson = await _getForPlatformAsync(projectRoot, assetsUrl, 'android', {
    errorCode: 'INVALID_ASSETS',
  });

  return {
    android: { code: androidBundle, map: androidSourceMap, assets: JSON.parse(androidAssetsJson) },
    ios: { code: iosBundle, map: iosSourceMap, assets: JSON.parse(iosAssetsJson) },
  };
}

async function _getForPlatformAsync(
  projectRoot: string,
  url: string,
  platform: Platform,
  { errorCode, minLength }: { errorCode: ErrorCode; minLength?: number }
): Promise<string> {
  const fullUrl = `${url}&platform=${platform}`;
  let response;

  try {
    response = await axios.request({
      url: fullUrl,
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

async function _handleKernelPublishedAsync({
  projectRoot,
  user,
  exp,
  url,
}: {
  projectRoot: string;
  user: User;
  exp: ExpoAppManifest;
  url: string;
}) {
  let kernelBundleUrl = `${Config.api.scheme}://${Config.api.host}`;
  if (Config.api.port) {
    kernelBundleUrl = `${kernelBundleUrl}:${Config.api.port}`;
  }
  kernelBundleUrl = `${kernelBundleUrl}/@${user.username}/${exp.slug}/bundle`;

  if (exp.kernel?.androidManifestPath) {
    const manifest = await ExponentTools.getManifestAsync(url, {
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

  if (exp.kernel?.iosManifestPath) {
    const manifest = await ExponentTools.getManifestAsync(url, {
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

type JobState = 'pending' | 'started' | 'in-progress' | 'finished' | 'errored' | 'sent-to-queue';

export type TurtleMode = 'normal' | 'high' | 'high_only';

// https://github.com/expo/universe/blob/283efaba3acfdefdc7db12f649516b6d6a94bec4/server/www/src/data/entities/builds/BuildJobEntity.ts#L25-L56
export interface BuildJobFields {
  id: string;
  experienceName: string;
  status: JobState;
  platform: 'ios' | 'android';
  userId: string | null;
  experienceId: string;
  artifactId: string | null;
  nonce: string | null;
  artifacts: {
    url?: string;
    manifestPlistUrl?: string;
  } | null;
  config: {
    buildType?: string;
    releaseChannel?: string;
    bundleIdentifier?: string;
  };
  logs: object | null;
  extraData: {
    request_id?: string;
    turtleMode?: TurtleMode;
  } | null;
  created: Date;
  updated: Date;
  expirationDate: Date;
  sdkVersion: string | null;
  turtleVersion: string | null;
  buildDuration: number | null;
  priority: string;
  accountId: string | null;
}

export type BuildStatusResult = {
  jobs: BuildJobFields[];
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
    sdkVersion: joi.string().strict(),
  });

  const { error } = schema.validate(options);
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

async function _waitForRunningAsync(
  projectRoot: string,
  url: string,
  retries: number = 300
): Promise<true> {
  try {
    const response = await axios.request({
      url,
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
const NODE_12_WINDOWS_METRO_ERROR = `Invalid regular expression: /(.*\\__fixtures__\\.*|node_modules[\\]react[\\]dist[\\].*|website\\node_modules\\.*|heapCapture\\bundle.js|.*\\__tests__\\.*)$/: Unterminated character class`;
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
  // As of react-native 0.61.x, Metro prints console logs from the device to console, without
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

  const reactNativeNodeModulesPath = path.join(
    projectRoot,
    'node_modules',
    'react-native',
    'node_modules'
  );
  const reactNativeNodeModulesPattern = escapeRegExp(reactNativeNodeModulesPath);
  const reactNativeNodeModulesCollisionRegex = new RegExp(
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
export async function startReactNativeServerAsync({
  projectRoot,
  options = {},
  exp = getConfig(projectRoot).exp,
  verbose = true,
}: {
  projectRoot: string;
  options: StartOptions;
  exp?: ExpoConfig;
  verbose?: boolean;
}): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  await stopReactNativeServerAsync(projectRoot);
  await Watchman.addToPathAsync(); // Attempt to fix watchman if it's hanging
  await Watchman.unblockAndGetVersionAsync(projectRoot);

  let packagerPort = await _getFreePortAsync(19001); // Create packager options

  const customLogReporterPath: string = require.resolve(path.join(__dirname, '../build/reporter'));

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
      try {
        packagerOpts.assetPlugins = resolveModule('expo/tools/hashAssetFiles', projectRoot, exp);
      } catch (e) {
        throw new Error(
          'Unable to find the expo-asset package in the current project. Install it and try again.'
        );
      }
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

    // Provide a fallback if the value isn't given
    const userSourceExts = userPackagerOpts.sourceExts ?? [];

    packagerOpts = {
      ...packagerOpts,
      ...userPackagerOpts,
      // In order to prevent people from forgetting to include the .expo extension or other things
      // NOTE(brentvatne): we should probably do away with packagerOpts soon in favor of @expo/metro-config!
      sourceExts: [...new Set([...packagerOpts.sourceExts, ...userSourceExts])],
    };

    if (userPackagerOpts.port !== undefined && userPackagerOpts.port !== null) {
      packagerPort = userPackagerOpts.port;
    }
  }
  const cliOpts = ['start'];
  for (const [key, val] of Object.entries(packagerOpts)) {
    // If the packager opt value is boolean, don't set
    // --[opt] [value], just set '--opt'
    if (val && typeof val === 'boolean') {
      cliOpts.push(`--${key}`);
    } else if (val) {
      cliOpts.push(`--${key}`, val);
    }
  }

  if (process.env.EXPO_DEBUG) {
    cliOpts.push('--verbose');
  }

  if (options.reset) {
    cliOpts.push('--reset-cache');
  }

  // Get custom CLI path from project package.json, but fall back to node_module path
  const defaultCliPath = resolveModule('react-native/local-cli/cli.js', projectRoot, exp);
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
  const packagerProcess = child_process.fork(cliPath, cliOpts, {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.METRO_NODE_OPTIONS,
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
  const exitPromise = new Promise((resolve, reject) => {
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
  const packagerUrl = await UrlUtils.constructBundleUrlAsync(projectRoot, {
    urlType: 'http',
    hostType: 'localhost',
  });
  await Promise.race([_waitForRunningAsync(projectRoot, `${packagerUrl}/status`), exitPromise]);
}

// Simulate the node_modules resolution
// If you project dir is /Jesse/Expo/Universe/BubbleBounce, returns
// "/Jesse/node_modules:/Jesse/Expo/node_modules:/Jesse/Expo/Universe/node_modules:/Jesse/Expo/Universe/BubbleBounce/node_modules"
function _nodePathForProjectRoot(projectRoot: string): string {
  const paths = [];
  let directory = path.resolve(projectRoot);
  while (true) {
    paths.push(path.join(directory, 'node_modules'));
    const parentDirectory = path.dirname(directory);
    if (directory === parentDirectory) {
      break;
    }
    directory = parentDirectory;
  }
  return paths.join(path.delimiter);
}
export async function stopReactNativeServerAsync(projectRoot: string): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
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

export async function startExpoServerAsync(projectRoot: string): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  await stopExpoServerAsync(projectRoot);
  const app = express();
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
      const deviceId = req.get('Device-Id');
      const deviceName = req.get('Device-Name');
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
  const expRc = await readExpRcAsync(projectRoot);
  const expoServerPort = expRc.manifestPort ? expRc.manifestPort : await _getFreePortAsync(19000);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort,
  });
  let server = app.listen(expoServerPort, () => {
    const info = server.address() as AddressInfo;
    const host = info.address;
    const port = info.port;
    ProjectUtils.logDebug(projectRoot, 'expo', `Local server listening at http://${host}:${port}`);
  });
}

async function stopExpoServerAsync(projectRoot: string): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (packagerInfo && packagerInfo.expoServerPort) {
    try {
      await axios.request({
        method: 'post',
        url: `http://127.0.0.1:${packagerInfo.expoServerPort}/shutdown`,
      });
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
    process.env.EXPO_TARGET = startOptions.target;
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
  const packageShortName = path.parse(projectRoot).base;
  const expRc = await readExpRcAsync(projectRoot);

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
      const expoServerNgrokUrl = await _connectToNgrokAsync(
        projectRoot,
        {
          authtoken: Config.ngrok.authToken,
          port: expoServerPort,
          proto: 'http',
        },
        async () => {
          const randomness = expRc.manifestTunnelRandomness
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
      const packagerNgrokUrl = await _connectToNgrokAsync(
        projectRoot,
        {
          authtoken: Config.ngrok.authToken,
          port: packagerInfo.packagerPort,
          proto: 'http',
        },
        async () => {
          const randomness = expRc.manifestTunnelRandomness
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

async function stopTunnelsAsync(projectRoot: string): Promise<void> {
  _assertValidProjectRoot(projectRoot);
  // This will kill all ngrok tunnels in the process.
  // We'll need to change this if we ever support more than one project
  // open at a time in XDE.
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  const ngrokProcess = ngrok.process();
  const ngrokProcessPid = ngrokProcess ? ngrokProcess.pid : null;
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
  if (options.packagerPort != null && !Number.isInteger(options.packagerPort)) {
    throw new XDLError('INVALID_OPTIONS', 'packagerPort must be an integer');
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, options);
}

export async function startAsync(
  projectRoot: string,
  { exp = getConfig(projectRoot).exp, ...options }: StartOptions & { exp?: ExpoConfig } = {},
  verbose: boolean = true
): Promise<ExpoConfig> {
  _assertValidProjectRoot(projectRoot);
  Analytics.logEvent('Start Project', {
    projectRoot,
    developerTool: Config.developerTool,
    sdkVersion: exp.sdkVersion ?? null,
  });

  if (options.webOnly) {
    await Webpack.restartAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'web');
    return exp;
  } else if (getenv.boolish('EXPO_USE_DEV_SERVER', false)) {
    await startDevServerAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'native');
  } else {
    await startExpoServerAsync(projectRoot);
    await startReactNativeServerAsync({ projectRoot, exp, options, verbose });
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
  if (!Config.offline) {
    try {
      await stopTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error stopping ngrok ${e.message}`);
    }
  }

  await Android.maybeStopAdbDaemonAsync();
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
