import {
  configFilename,
  ExpoAppManifest,
  ExpoConfig,
  getConfig,
  getDefaultTarget,
  Hook,
  HookArguments,
  HookType,
  PackageJSONConfig,
  Platform,
  ProjectTarget,
  resolveModule,
} from '@expo/config';
import { bundleAsync } from '@expo/dev-server';
import JsonFile from '@expo/json-file';
import joi from '@hapi/joi';
import assert from 'assert';
import axios from 'axios';
import chalk from 'chalk';
import crypto from 'crypto';
import decache from 'decache';
import FormData from 'form-data';
import fs from 'fs-extra';
import getenv from 'getenv';
import HashIds from 'hashids';
import path from 'path';
import readLastLines from 'read-last-lines';
import semver from 'semver';
import slug from 'slugify';
import urljoin from 'url-join';
import uuid from 'uuid';

import Analytics from './Analytics';
import * as Android from './Android';
import ApiV2 from './ApiV2';
import Config from './Config';
import * as DevSession from './DevSession';
import * as EmbeddedAssets from './EmbeddedAssets';
import { maySkipManifestValidation } from './Env';
import { ErrorCode } from './ErrorCode';
import logger from './Logger';
import { Asset, exportAssetsAsync, publishAssetsAsync } from './ProjectAssets';
import * as ProjectSettings from './ProjectSettings';
import * as Sentry from './Sentry';
import * as ThirdParty from './ThirdParty';
import * as UrlUtils from './UrlUtils';
import UserManager, { ANONYMOUS_USERNAME, User } from './User';
import * as Versions from './Versions';
import * as Webpack from './Webpack';
import XDLError from './XDLError';
import * as ExponentTools from './detach/ExponentTools';
import * as TableText from './logs/TableText';
import { learnMore } from './logs/TerminalLink';
import * as Doctor from './project/Doctor';
import * as ProjectUtils from './project/ProjectUtils';
import { assertValidProjectRoot } from './project/errors';
import { startTunnelsAsync, stopTunnelsAsync } from './project/ngrok';
import { startDevServerAsync, StartOptions } from './project/startDevServerAsync';
import { startExpoServerAsync, stopExpoServerAsync } from './project/startLegacyExpoServerAsync';
import {
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
} from './project/startLegacyReactNativeServerAsync';
import { writeArtifactSafelyAsync } from './tools/ArtifactUtils';
import { resolveEntryPoint } from './tools/resolveEntryPoint';

const MINIMUM_BUNDLE_SIZE = 500;

type SelfHostedIndex = ExpoAppManifest & {
  dependencies: string[];
};

type LoadedHook = Hook & {
  _fn: (input: HookArguments) => any;
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

type BundlePlatform = 'android' | 'ios';

type PlatformMetadata = { bundle: string; assets: { path: string; ext: string }[] };

type FileMetadata = {
  [key in BundlePlatform]: PlatformMetadata;
};

type Metadata = {
  version: 0;
  bundler: 'metro';
  fileMetadata: FileMetadata;
};

const bundlePlatforms: BundlePlatform[] = ['android', 'ios'];

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
 * Returns true if we should use Metro using its JS APIs via @expo/dev-server (the modern and fast
 * way), false if we should fall back to spawning it as a subprocess (supported for backwards
 * compatibility with SDK39 and older).
 */
function shouldUseDevServer(exp: ExpoConfig) {
  return Versions.gteSdkVersion(exp, '40.0.0') || getenv.boolish('EXPO_USE_DEV_SERVER', false);
}

/**
 * If the `eas` flag is true, the stucture of the outputDir will be:
├── assets
│   └── *
├── bundles
│   ├── android-01ee6e3ab3e8c16a4d926c91808d5320.js
│   └── ios-ee8206cc754d3f7aa9123b7f909d94ea.js
└── metadata.json

 * If the `eas` flag is not true, then this function is for self hosting 
 * and the outputDir will have the files created in the project directory the following way:
.
├── android-index.json
├── ios-index.json
├── assets
│   └── 1eccbc4c41d49fd81840aef3eaabe862
└── bundles
      ├── android-01ee6e3ab3e8c16a4d926c91808d5320.js
      └── ios-ee8206cc754d3f7aa9123b7f909d94ea.js
 */
export async function exportAppAsync(
  projectRoot: string,
  publicUrl: string,
  assetUrl: string,
  outputDir: string,
  options: {
    isDev?: boolean;
    dumpAssetmap?: boolean;
    dumpSourcemap?: boolean;
    publishOptions?: PublishOptions;
  } = {},
  experimentalBundle: boolean
): Promise<void> {
  const absoluteOutputDir = path.resolve(process.cwd(), outputDir);
  const defaultTarget = getDefaultTarget(projectRoot);
  const target = options.publishOptions?.target ?? defaultTarget;

  // build the bundles
  // make output dirs if not exists
  const assetPathToWrite = path.resolve(projectRoot, path.join(outputDir, 'assets'));
  await fs.ensureDir(assetPathToWrite);
  const bundlesPathToWrite = path.resolve(projectRoot, path.join(outputDir, 'bundles'));
  await fs.ensureDir(bundlesPathToWrite);

  const { exp, pkg, hooks } = await _getPublishExpConfigAsync(
    projectRoot,
    options.publishOptions || {}
  );

  const bundles = await buildPublishBundlesAsync(projectRoot, options.publishOptions, {
    dev: options.isDev,
    useDevServer: shouldUseDevServer(exp),
  });
  const iosBundle = bundles.ios.code;
  const androidBundle = bundles.android.code;

  const iosBundleHash = crypto.createHash('md5').update(iosBundle).digest('hex');
  const iosBundleUrl = `ios-${iosBundleHash}.js`;
  const iosJsPath = path.join(absoluteOutputDir, 'bundles', iosBundleUrl);

  const androidBundleHash = crypto.createHash('md5').update(androidBundle).digest('hex');
  const androidBundleUrl = `android-${androidBundleHash}.js`;
  const androidJsPath = path.join(absoluteOutputDir, 'bundles', androidBundleUrl);

  const relativeBundlePaths = {
    android: path.join('bundles', androidBundleUrl),
    ios: path.join('bundles', iosBundleUrl),
  };

  await writeArtifactSafelyAsync(projectRoot, null, iosJsPath, iosBundle);
  await writeArtifactSafelyAsync(projectRoot, null, androidJsPath, androidBundle);

  logger.global.info('Finished saving JS Bundles.');

  const { assets } = await exportAssetsAsync({
    projectRoot,
    exp,
    hostedUrl: publicUrl,
    assetPath: 'assets',
    outputDir: absoluteOutputDir,
    bundles,
    experimentalBundle,
  });

  if (experimentalBundle) {
    // Build metadata.json
    const fileMetadata: {
      [key in BundlePlatform]: Partial<PlatformMetadata>;
    } = { android: {}, ios: {} };
    bundlePlatforms.forEach(platform => {
      fileMetadata[platform].assets = [];
      bundles[platform].assets.forEach((asset: { type: string; fileHashes: string[] }) => {
        fileMetadata[platform].assets = [
          ...fileMetadata[platform].assets!,
          ...asset.fileHashes.map(hash => {
            return { path: path.join('assets', hash), ext: asset.type };
          }),
        ];
      });
      fileMetadata[platform].bundle = relativeBundlePaths[platform];
    });
    const metadata: Metadata = {
      version: 0,
      bundler: 'metro',
      fileMetadata: fileMetadata as FileMetadata,
    };

    fs.writeFileSync(path.resolve(outputDir, 'metadata.json'), JSON.stringify(metadata));
  }

  if (options.dumpAssetmap) {
    logger.global.info('Dumping asset map.');

    const assetmap: { [hash: string]: Asset } = {};

    assets.forEach((asset: Asset) => {
      assetmap[asset.hash] = asset;
    });

    await writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(absoluteOutputDir, 'assetmap.json'),
      JSON.stringify(assetmap)
    );
  }

  const iosSourceMap = bundles.ios.map;
  const androidSourceMap = bundles.android.map;

  // build source maps
  if (options.dumpSourcemap) {
    // write the sourcemap files
    const iosMapName = `ios-${iosBundleHash}.map`;
    const iosMapPath = path.join(absoluteOutputDir, 'bundles', iosMapName);
    await writeArtifactSafelyAsync(projectRoot, null, iosMapPath, iosSourceMap);

    const androidMapName = `android-${androidBundleHash}.map`;
    const androidMapPath = path.join(absoluteOutputDir, 'bundles', androidMapName);
    await writeArtifactSafelyAsync(projectRoot, null, androidMapPath, androidSourceMap);

    if (target === 'managed' && semver.lt(exp.sdkVersion, '40.0.0')) {
      // Remove original mapping to incorrect sourcemap paths
      // In SDK 40+ and bare projects, we no longer need to do this.
      logger.global.info('Configuring source maps');
      await truncateLastNLines(iosJsPath, 1);
      await truncateLastNLines(androidJsPath, 1);
    }

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
      path.join(absoluteOutputDir, 'debug.html'),
      debugHtml
    );
  }

  // Skip the hooks and manifest creation if building for EAS.
  if (!experimentalBundle) {
    const validPostExportHooks = prepareHooks(hooks, 'postExport', projectRoot, exp);

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
      path.join(absoluteOutputDir, 'android-index.json'),
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
      path.join(absoluteOutputDir, 'ios-index.json'),
      JSON.stringify(iosManifest)
    );

    assert(androidManifest!, 'should have been assigned');
    assert(iosManifest!, 'should have been assigned');
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

  // Exit early if kernel builds are created with robot users
  if (exp.isKernel && user.kind === 'robot') {
    throw new XDLError('ROBOT_ACCOUNT_ERROR', 'Kernel builds are not available for robot users');
  }

  // TODO: refactor this out to a function, throw error if length doesn't match
  const validPostPublishHooks: LoadedHook[] = prepareHooks(hooks, 'postPublish', projectRoot, exp);
  const bundles = await buildPublishBundlesAsync(projectRoot, options, {
    useDevServer: shouldUseDevServer(exp),
  });
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
    `💡 JavaScript bundle sizes affect startup time. ${chalk.dim(
      learnMore(`https://expo.fyi/javascript-bundle-sizes`)
    )}`
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
  // This method throws early when a robot account is used for a kernel build
  if (exp.isKernel && user.kind !== 'robot') {
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
  const { exp: privateExp } = getConfig(projectRoot);
  const { hooks } = privateExp;
  const { exp, pkg } = getConfig(projectRoot, { isPublicConfig: true });

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
  bundleOptions: { dev?: boolean; useDevServer: boolean }
) {
  if (!bundleOptions.useDevServer) {
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
      entryPoint: resolveEntryPoint(projectRoot, platform),
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
  const entryPoint = resolveEntryPoint(projectRoot);
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
  jobs?: BuildJobFields[];
  err?: null;
  userHasBuiltAppBefore: boolean;
  userHasBuiltExperienceBefore: boolean;
  canPurchasePriorityBuilds?: boolean;
  numberOfRemainingPriorityBuilds?: number;
  hasUnlimitedPriorityBuilds?: boolean;
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

  assertValidProjectRoot(projectRoot);
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

  assertValidProjectRoot(projectRoot);
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

export async function setOptionsAsync(
  projectRoot: string,
  options: {
    packagerPort?: number;
  }
): Promise<void> {
  assertValidProjectRoot(projectRoot); // Check to make sure all options are valid
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
  assertValidProjectRoot(projectRoot);
  Analytics.logEvent('Start Project', {
    projectRoot,
    developerTool: Config.developerTool,
    sdkVersion: exp.sdkVersion ?? null,
  });

  if (options.webOnly) {
    await Webpack.restartAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'web');
    return exp;
  } else if (shouldUseDevServer(exp) || options.devClient) {
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

export {
  startTunnelsAsync,
  stopTunnelsAsync,
  startExpoServerAsync,
  StartOptions,
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
};
