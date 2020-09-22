import {
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
import axios from 'axios';
import chalk from 'chalk';
import crypto from 'crypto';
import decache from 'decache';
import fs from 'fs-extra';
import getenv from 'getenv';
import HashIds from 'hashids';
import path from 'path';
import readLastLines from 'read-last-lines';
import semver from 'semver';
import terminalLink from 'terminal-link';
import urljoin from 'url-join';
import uuid from 'uuid';

import Analytics from './Analytics';
import ApiV2 from './ApiV2';
import Config from './Config';
import * as EmbeddedAssets from './EmbeddedAssets';
import { maySkipManifestValidation } from './Env';
import { ErrorCode } from './ErrorCode';
import * as Exp from './Exp';
import logger from './Logger';
import { Asset, exportAssetsAsync, PlatformBundles, publishAssetsAsync } from './ProjectAssets';
import { startReactNativeServerAsync, stopReactNativeServerAsync } from './ReactNativeServer';
import * as Sentry from './Sentry';
import * as UrlUtils from './UrlUtils';
import UserManager, { ANONYMOUS_USERNAME, User } from './User';
import XDLError from './XDLError';
import * as ExponentTools from './detach/ExponentTools';
import * as TableText from './logs/TableText';
import * as Doctor from './project/Doctor';
import { PackagerOptions } from './project/ManifestHandler';
import * as ProjectUtils from './project/ProjectUtils';
import { writeArtifactSafelyAsync } from './tools/ArtifactUtils';
import FormData from './tools/FormData';

const MINIMUM_BUNDLE_SIZE = 500;

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

type SelfHostedIndex = ExpoAppManifest & {
  dependencies: string[];
};

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
    // platforms?: Platform[];
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

  //   const platforms = options.platforms ?? ['android', 'ios'];
  const platforms: Platform[] = ['android', 'ios'];
  const bundles = await buildPublishBundlesAsync(projectRoot, options.publishOptions, {
    dev: options.isDev,
    platforms,
  });

  const iosBundle = bundles.ios!.code;
  const androidBundle = bundles.android!.code;

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
  const { hooks } = exp;
  delete exp.hooks;
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

  const iosSourceMap = bundles.ios!.map;
  const androidSourceMap = bundles.android!.map;

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

async function runHook(hook: LoadedHook, hookOptions: Omit<HookArguments, 'config'>) {
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

async function buildPublishBundlesAsync(
  projectRoot: string,
  publishOptions: PublishOptions = {},
  bundleOptions: { dev?: boolean; platforms?: Platform[] } = {}
): Promise<PlatformBundles> {
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

  const platforms: Platform[] = bundleOptions.platforms ?? ['android', 'ios'];
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

async function _getPublishExpConfigAsync(
  projectRoot: string,
  options: PublishOptions
): Promise<{
  exp: ExpoAppManifest;
  pkg: PackageJSONConfig;
}> {
  if (options.releaseChannel != null && typeof options.releaseChannel !== 'string') {
    throw new XDLError('INVALID_OPTIONS', 'releaseChannel must be a string');
  }
  options.releaseChannel = options.releaseChannel || 'default';

  // Verify that exp/app.json and package.json exist
  const { exp, pkg } = getConfig(projectRoot);

  if (exp.android?.config) {
    delete exp.android.config;
  }

  if (exp.ios?.config) {
    delete exp.ios.config;
  }

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
  };
}

// Fetch iOS and Android bundles for publishing
async function fetchPublishBundlesAsync(
  projectRoot: string,
  opts?: PackagerOptions
): Promise<PlatformBundles> {
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

export async function publishAsync(
  projectRoot: string,
  publishOptions: PublishOptions = {}
): Promise<PublishedProjectResult> {
  publishOptions.target = publishOptions.target ?? getDefaultTarget(projectRoot);
  const target = publishOptions.target;
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
  const { exp, pkg } = await _getPublishExpConfigAsync(projectRoot, publishOptions);

  // TODO: refactor this out to a function, throw error if length doesn't match
  const { hooks } = exp;
  delete exp.hooks;
  const validPostPublishHooks: LoadedHook[] = prepareHooks(hooks, 'postPublish', projectRoot, exp);
  const bundles = await buildPublishBundlesAsync(projectRoot, publishOptions);
  const androidBundle = bundles.android!.code;
  const iosBundle = bundles.ios!.code;

  const files = [
    ['index.ios.js', bundles.ios!.code],
    ['index.android.js', bundles.android!.code],
  ];
  // Account for inline source maps
  if (bundles.ios!.map) {
    files.push([chalk.dim('index.ios.js.map'), bundles.ios!.map]);
  }
  if (bundles.android!.map) {
    files.push([chalk.dim('index.android.js.map'), bundles.android!.map]);
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
  const androidSourceMap = hasHooks || shouldPublishAndroidMaps ? bundles.android!.map : null;
  const iosSourceMap = hasHooks || shouldPublishIosMaps ? bundles.ios!.map : null;

  let response;
  try {
    response = await _uploadArtifactsAsync({
      pkg,
      exp,
      iosBundle,
      androidBundle,
      options: publishOptions,
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
        'Expo-Release-Channel': publishOptions.releaseChannel,
        Accept: 'application/expo+json,application/json',
      }),
      ExponentTools.getManifestAsync(response.url, {
        'Exponent-SDK-Version': exp.sdkVersion,
        'Exponent-Platform': 'ios',
        'Expo-Release-Channel': publishOptions.releaseChannel,
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
    releaseChannel: publishOptions.releaseChannel ?? 'default',
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
      publishOptions.releaseChannel && publishOptions.releaseChannel !== 'default'
        ? `${response.url}?release-channel=${publishOptions.releaseChannel}`
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
