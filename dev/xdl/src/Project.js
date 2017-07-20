/**
 * @flow
 */

import 'instapromise';

import bodyParser from 'body-parser';
import child_process from 'child_process';
import delayAsync from 'delay-async';
import decache from 'decache';
import express from 'express';
import freeportAsync from 'freeport-async';
import fs from 'fs';
import joi from 'joi';
import _ from 'lodash';
import ngrok from '@expo/ngrok';
import os from 'os';
import path from 'path';
import request from 'request';
import spawnAsync from '@expo/spawn-async';
import treekill from 'tree-kill';
import md5hex from 'md5hex';

import * as Analytics from './Analytics';
import * as Android from './Android';
import Api from './Api';
import Config from './Config';
import * as Doctor from './project/Doctor';
import ErrorCode from './ErrorCode';
import logger from './Logger';
import * as ExponentTools from './detach/ExponentTools';
import * as Exp from './Exp';
import * as ExpSchema from './project/ExpSchema';
import * as ProjectSettings from './ProjectSettings';
import * as ProjectUtils from './project/ProjectUtils';
import * as UrlUtils from './UrlUtils';
import UserManager from './User';
import UserSettings from './UserSettings';
import * as Versions from './Versions';
import * as Watchman from './Watchman';
import XDLError from './XDLError';

import type { User as ExpUser } from './User'; //eslint-disable-line

const MINIMUM_BUNDLE_SIZE = 500;

type CachedSignedManifest = {
  manifestString: ?string,
  signedManifest: ?string,
};

let _cachedSignedManifest: CachedSignedManifest = {
  manifestString: null,
  signedManifest: null,
};

export type ProjectStatus = 'running' | 'ill' | 'exited';

export async function currentStatus(
  projectDir: string
): Promise<ProjectStatus> {
  const manifestUrl = await UrlUtils.constructManifestUrlAsync(projectDir, {
    urlType: 'http',
  });
  const packagerUrl = await UrlUtils.constructBundleUrlAsync(projectDir, {
    urlType: 'http',
  });

  let packagerRunning = false;
  try {
    const res = await request.promise(`${packagerUrl}/debug`);

    if (res.statusCode < 400) {
      packagerRunning = true;
    }
  } catch (e) {}

  let manifestServerRunning = false;
  try {
    const res = await request.promise(manifestUrl);
    if (res.statusCode < 400) {
      manifestServerRunning = true;
    }
  } catch (e) {}

  if (packagerRunning && manifestServerRunning) {
    return 'running';
  } else if (packagerRunning || manifestServerRunning) {
    return 'ill';
  } else {
    return 'exited';
  }
}

async function _assertValidProjectRoot(projectRoot) {
  if (!projectRoot) {
    throw new XDLError(ErrorCode.NO_PROJECT_ROOT, 'No project root specified');
  }
}

async function _getFreePortAsync(rangeStart) {
  let port = await freeportAsync(rangeStart);
  if (!port) {
    throw new XDLError(ErrorCode.NO_PORT_FOUND, 'No available port found');
  }

  return port;
}

async function _getForPlatformAsync(
  projectRoot,
  url,
  platform,
  { errorCode, minLength }
) {
  url = UrlUtils.getPlatformSpecificBundleUrl(url, platform);

  let fullUrl = `${url}&platform=${platform}`;
  let response = await request.promise.get({
    url: fullUrl,
    headers: {
      'Exponent-Platform': platform,
    },
  });

  if (response.statusCode !== 200) {
    if (response.body) {
      let body;
      try {
        body = JSON.parse(response.body);
      } catch (e) {
        ProjectUtils.logError(projectRoot, 'expo', response.body);
      }

      if (body !== undefined) {
        if (body.message) {
          ProjectUtils.logError(projectRoot, 'expo', body.message);
        } else {
          ProjectUtils.logError(projectRoot, 'expo', response.body);
        }
      }
    }
    throw new XDLError(
      errorCode,
      `Packager URL ${fullUrl} returned unexpected code ${response.statusCode}. Please open your project in the Expo app and see if there are any errors. Also scroll up and make sure there were no errors or warnings when opening your project.`
    );
  }

  if (!response.body || (minLength && response.body.length < minLength)) {
    throw new XDLError(errorCode, `Body is: ${response.body}`);
  }

  return response.body;
}

async function _resolveManifestAssets(projectRoot, manifest, resolver) {
  try {
    // Asset fields that the user has set
    const assetSchemas = (await ExpSchema.getAssetSchemasAsync(
      manifest.sdkVersion
    )).filter(({ fieldPath }) => _.get(manifest, fieldPath));

    // Get the URLs
    const urls = await Promise.all(
      assetSchemas.map(async ({ fieldPath }) => {
        const pathOrURL = _.get(manifest, fieldPath);
        if (fs.existsSync(path.resolve(projectRoot, pathOrURL))) {
          return await resolver(pathOrURL);
        } else {
          return pathOrURL; // Assume already a URL
        }
      })
    );

    // Set the corresponding URL fields
    assetSchemas.forEach(({ fieldPath }, index) =>
      _.set(manifest, fieldPath + 'Url', urls[index])
    );
  } catch (e) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Unable to resolve manifest assets. Icons might not work. ${e.message}.`
    );
  }
}

function _requireFromProject(modulePath, projectRoot) {
  try {
    if (modulePath.indexOf('.') === 0) {
      let fullPath = path.resolve(projectRoot, modulePath);

      // Clear the require cache for this module so get a fresh version of it
      // without requiring the user to restart XDE
      decache(fullPath);

      // $FlowIssue: doesn't work with dynamic requires
      return require(fullPath);
    } else {
      let fullPath = path.resolve(projectRoot, 'node_modules', modulePath);

      // Clear the require cache for this module so get a fresh version of it
      // without requiring the user to restart XDE
      decache(fullPath);

      // $FlowIssue: doesn't work with dynamic requires
      return require(fullPath);
    }
  } catch (e) {
    return null;
  }
}

export async function publishAsync(
  projectRoot: string,
  options: Object = {}
): Promise<{ url: string }> {
  const user = await UserManager.ensureLoggedInAsync();
  await _validatePackagerReadyAsync(projectRoot);
  Analytics.logEvent('Publish', { projectRoot });

  // Get project config
  let exp = await _getPublishExpConfigAsync(projectRoot, options);

  // TODO: refactor this out to a function, throw error if length doesn't match
  let { hooks } = exp;
  delete exp.hooks;
  let validPostPublishHooks = [];
  if (hooks && hooks.postPublish) {
    hooks.postPublish.forEach(hook => {
      let { file, config } = hook;
      let fn = _requireFromProject(file, projectRoot);
      if (fn === null) {
        logger.global.error(`Unable to load postPublishHook: '${file}'`);
      } else {
        hook._fn = fn;
        validPostPublishHooks.push(hook);
      }
    });

    if (validPostPublishHooks.length !== hooks.postPublish.length) {
      logger.global.error();

      throw new XDLError(
        ErrorCode.HOOK_INITIALIZATION_ERROR,
        'Please fix your postPublish hook configuration.'
      );
    }
  }

  let { iosBundle, androidBundle } = await _buildPublishBundlesAsync(
    projectRoot
  );

  await _fetchAndUploadAssetsAsync(projectRoot, exp);

  let {
    iosSourceMap,
    androidSourceMap,
  } = await _maybeBuildSourceMapsAsync(projectRoot, exp, {
    force: validPostPublishHooks.length,
  });

  let response = await _uploadArtifactsAsync({
    exp,
    iosBundle,
    androidBundle,
    options,
  });

  await _maybeWriteArtifactsToDiskAsync({
    exp,
    projectRoot,
    iosBundle,
    androidBundle,
    iosSourceMap,
    androidSourceMap,
  });

  if (validPostPublishHooks.length) {
    let [androidManifest, iosManifest] = await Promise.all([
      ExponentTools.getManifestAsync(response.url, {
        'Exponent-SDK-Version': exp.sdkVersion,
        'Exponent-Platform': 'android',
      }),
      ExponentTools.getManifestAsync(response.url, {
        'Exponent-SDK-Version': exp.sdkVersion,
        'Exponent-Platform': 'ios',
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
      log: msg => {
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
        logger.global.warn(
          `Warning: postPublish hook '${hook.file}' failed: ${e.stack}`
        );
      }
    }
  }

  // TODO: move to postPublish hook
  if (exp.isKernel) {
    await _handleKernelPublishedAsync({
      user,
      exp,
      projectRoot,
      url: response.url,
    });
  }

  return response;
}

async function _uploadArtifactsAsync({
  exp,
  iosBundle,
  androidBundle,
  options,
}) {
  logger.global.info('Uploading JavaScript bundles');
  let formData = {
    expJson: JSON.stringify(exp),
    iosBundle: {
      value: iosBundle,
      options: {
        filename: 'iosBundle',
      },
    },
    androidBundle: {
      value: androidBundle,
      options: {
        filename: 'androidBundle',
      },
    },
  };

  let response = await Api.callMethodAsync('publish', [options], 'put', null, {
    formData,
  });

  return response;
}

async function _validatePackagerReadyAsync(projectRoot) {
  _assertValidProjectRoot(projectRoot);

  // Ensure the packager is started
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort) {
    throw new XDLError(
      ErrorCode.NO_PACKAGER_PORT,
      `No packager found for project at ${projectRoot}.`
    );
  }
}

async function _getPublishExpConfigAsync(projectRoot, options) {
  let schema = joi.object().keys(
    {
      // empty
    }
  );

  // Validate schema
  try {
    await joi.promise.validate(options, schema);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
  }

  // Verify that exp/app.json and package.json exist
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  if (!exp || !pkg) {
    const configName = await ProjectUtils.configFilenameAsync(projectRoot);
    throw new XDLError(
      ErrorCode.NO_PACKAGE_JSON,
      `Couldn't read ${configName} file in project at ${projectRoot}`
    );
  }

  // Support version and name being specified in package.json for legacy
  // support pre: exp.json
  if (!exp.version && pkg.version) {
    exp.version = pkg.version;
  }

  if (!exp.slug && pkg.name) {
    exp.slug = pkg.name;
  }

  if (exp.android && exp.android.config) {
    delete exp.android.config;
  }

  if (exp.ios && exp.ios.config) {
    delete exp.ios.config;
  }

  // Only allow test-suite to be published with UNVERSIONED
  if (exp.sdkVersion === 'UNVERSIONED' && !exp.slug.includes('test-suite')) {
    throw new XDLError(
      ErrorCode.INVALID_OPTIONS,
      'Cannot publish with sdkVersion UNVERSIONED.'
    );
  }

  return exp;
}

// Fetch iOS and Android bundles for publishing
async function _buildPublishBundlesAsync(projectRoot) {
  let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
  let publishUrl = await UrlUtils.constructPublishUrlAsync(
    projectRoot,
    entryPoint
  );

  logger.global.info('Building iOS bundle');
  let iosBundle = await _getForPlatformAsync(projectRoot, publishUrl, 'ios', {
    errorCode: ErrorCode.INVALID_BUNDLE,
    minLength: MINIMUM_BUNDLE_SIZE,
  });

  logger.global.info('Building Android bundle');
  let androidBundle = await _getForPlatformAsync(
    projectRoot,
    publishUrl,
    'android',
    {
      errorCode: ErrorCode.INVALID_BUNDLE,
      minLength: MINIMUM_BUNDLE_SIZE,
    }
  );

  return { iosBundle, androidBundle };
}

// note(brentvatne): currently we build source map anytime there is a
// postPublish hook -- we may have an option in the future to manually
// enable sourcemap building, but for now it's very fast, most apps in
// production should use sourcemaps for error reporting, and in the worst
// case, adding a few seconds to a postPublish hook isn't too annoying
async function _maybeBuildSourceMapsAsync(projectRoot, exp, options = {}) {
  if (!options.force) {
    return { iosSourceMap: null, androidSourceMap: null };
  }

  let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
  let sourceMapUrl = await UrlUtils.constructSourceMapUrlAsync(
    projectRoot,
    entryPoint
  );

  logger.global.info('Building sourcemaps');
  let iosSourceMap = await _getForPlatformAsync(
    projectRoot,
    sourceMapUrl,
    'ios',
    {
      errorCode: ErrorCode.INVALID_BUNDLE,
      minLength: MINIMUM_BUNDLE_SIZE,
    }
  );

  let androidSourceMap = await _getForPlatformAsync(
    projectRoot,
    sourceMapUrl,
    'android',
    {
      errorCode: ErrorCode.INVALID_BUNDLE,
      minLength: MINIMUM_BUNDLE_SIZE,
    }
  );

  return { iosSourceMap, androidSourceMap };
}

async function _fetchAndUploadAssetsAsync(projectRoot, exp) {
  logger.global.info('Analyzing assets');

  let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
  let assetsUrl = await UrlUtils.constructAssetsUrlAsync(
    projectRoot,
    entryPoint
  );

  let iosAssetsJson = await _getForPlatformAsync(
    projectRoot,
    assetsUrl,
    'ios',
    {
      errorCode: ErrorCode.INVALID_ASSETS,
    }
  );

  let androidAssetsJson = await _getForPlatformAsync(
    projectRoot,
    assetsUrl,
    'android',
    {
      errorCode: ErrorCode.INVALID_ASSETS,
    }
  );

  // Resolve manifest assets to their S3 URL and add them to the list of assets to
  // be uploaded
  const manifestAssets = [];
  await _resolveManifestAssets(projectRoot, exp, async assetPath => {
    const absolutePath = path.resolve(projectRoot, assetPath);
    const contents = await fs.promise.readFile(absolutePath);
    const hash = md5hex(contents);
    manifestAssets.push({ files: [absolutePath], fileHashes: [hash] });
    return 'https://d1wp6m56sqw74a.cloudfront.net/~assets/' + hash;
  });

  logger.global.info('Uploading assets');

  // Upload asset files
  const iosAssets = JSON.parse(iosAssetsJson);
  const androidAssets = JSON.parse(androidAssetsJson);
  const assets = iosAssets.concat(androidAssets).concat(manifestAssets);
  if (assets.length > 0 && assets[0].fileHashes) {
    await uploadAssetsAsync(projectRoot, assets);
  } else {
    logger.global.info({ quiet: true }, 'No assets to upload, skipped.');
  }
}

async function _maybeWriteArtifactsToDiskAsync({
  exp,
  projectRoot,
  iosBundle,
  androidBundle,
  iosSourceMap,
  androidSourceMap,
}) {
  if (exp.android && exp.android.publishBundlePath) {
    await fs.promise.writeFile(
      path.resolve(projectRoot, exp.android.publishBundlePath),
      androidBundle
    );
  }

  if (exp.ios && exp.ios.publishBundlePath) {
    await fs.promise.writeFile(
      path.resolve(projectRoot, exp.ios.publishBundlePath),
      iosBundle
    );
  }

  if (exp.android && exp.android.publishSourceMapPath) {
    await fs.promise.writeFile(
      path.resolve(projectRoot, exp.android.publishSourceMapPath),
      androidSourceMap
    );
  }

  if (exp.ios && exp.ios.publishSourceMapPath) {
    await fs.promise.writeFile(
      path.resolve(projectRoot, exp.ios.publishSourceMapPath),
      iosSourceMap
    );
  }
}

async function _handleKernelPublishedAsync({ projectRoot, user, exp, url }) {
  let kernelBundleUrl = `${Config.api.scheme}://${Config.api.host}`;
  if (Config.api.port) {
    kernelBundleUrl = `${kernelBundleUrl}:${Config.api.port}`;
  }
  kernelBundleUrl = `${kernelBundleUrl}/@${user.username}/${exp.slug}/bundle`;

  if (exp.kernel.androidManifestPath) {
    let manifest = await ExponentTools.getManifestAsync(url, {
      'Exponent-SDK-Version': exp.sdkVersion,
      'Exponent-Platform': 'android',
    });
    manifest.bundleUrl = kernelBundleUrl;
    manifest.sdkVersion = 'UNVERSIONED';
    await fs.promise.writeFile(
      path.resolve(projectRoot, exp.kernel.androidManifestPath),
      JSON.stringify(manifest)
    );
  }

  if (exp.kernel.iosManifestPath) {
    let manifest = await ExponentTools.getManifestAsync(url, {
      'Exponent-SDK-Version': exp.sdkVersion,
      'Exponent-Platform': 'ios',
    });
    manifest.bundleUrl = kernelBundleUrl;
    manifest.sdkVersion = 'UNVERSIONED';
    await fs.promise.writeFile(
      path.resolve(projectRoot, exp.kernel.iosManifestPath),
      JSON.stringify(manifest)
    );
  }
}

// TODO(jesse): Add analytics for upload
async function uploadAssetsAsync(projectRoot, assets) {
  // Collect paths by key, also effectively handles duplicates in the array
  const paths = {};
  assets.forEach(asset => {
    asset.files.forEach((path, index) => {
      paths[asset.fileHashes[index]] = path;
    });
  });

  // Collect list of assets missing on host
  const metas = (await Api.callMethodAsync('assetsMetadata', [], 'post', {
    keys: Object.keys(paths),
  })).metadata;
  const missing = Object.keys(paths).filter(key => !metas[key].exists);

  if (missing.length === 0) {
    logger.global.info({ quiet: true }, `No assets changed, skipped.`);
  }

  // Upload them!
  await Promise.all(
    _.chunk(missing, 5).map(async keys => {
      let formData = {};
      keys.forEach(key => {
        ProjectUtils.logDebug(projectRoot, 'expo', `uploading ${paths[key]}`);

        let relativePath = paths[key].replace(projectRoot, '');
        logger.global.info({ quiet: true }, `Uploading ${relativePath}`);

        formData[key] = {
          value: fs.createReadStream(paths[key]),
          options: {
            filename: paths[key],
          },
        };
      });
      await Api.callMethodAsync('uploadAssets', [], 'put', null, { formData });
    })
  );
}

export async function buildAsync(
  projectRoot: string,
  options: {
    current?: boolean,
    mode?: string,
    platform?: string,
    expIds?: Array<string>,
  } = {}
) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  Analytics.logEvent('Build Shell App', {
    projectRoot,
  });

  let schema = joi.object().keys({
    current: joi.boolean(),
    mode: joi.string(),
    platform: joi.any().valid('ios', 'android', 'all'),
    expIds: joi.array(),
  });

  try {
    await joi.promise.validate(options, schema);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
  }

  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  const configName = await ProjectUtils.configFilenameAsync(projectRoot);
  const configPrefix = configName === 'app.json' ? 'expo.' : '';

  if (!exp || !pkg) {
    throw new XDLError(
      ErrorCode.NO_PACKAGE_JSON,
      `Couldn't read ${configName} file in project at ${projectRoot}`
    );
  }

  // Support version and name being specified in package.json for legacy
  // support pre: exp.json
  if (!exp.version && pkg.version) {
    exp.version = pkg.version;
  }
  if (!exp.slug && pkg.name) {
    exp.slug = pkg.name;
  }

  if (options.platform === 'ios' || options.platform === 'all') {
    if (!exp.ios || !exp.ios.bundleIdentifier) {
      throw new XDLError(
        ErrorCode.INVALID_MANIFEST,
        `Must specify a bundle identifier in order to build this experience for iOS. Please specify one in ${configName} at "${configPrefix}ios.bundleIdentifier"`
      );
    }
  }

  if (options.platform === 'android' || options.platform === 'all') {
    if (!exp.android || !exp.android.package) {
      throw new XDLError(
        ErrorCode.INVALID_MANIFEST,
        `Must specify a java package in order to build this experience for Android. Please specify one in ${configName} at "${configPrefix}android.package"`
      );
    }
  }

  let response = await Api.callMethodAsync('build', [], 'put', {
    manifest: exp,
    options,
  });

  return response;
}

async function _waitForRunningAsync(url) {
  try {
    let response = await request.promise(url);
    // Looking for "Cached Bundles" string is hacky, but unfortunately
    // ngrok returns a 200 when it succeeds but the port it's proxying
    // isn't bound.
    if (
      response.statusCode >= 200 &&
      response.statusCode < 300 &&
      response.body &&
      response.body.includes('Cached Bundles')
    ) {
      return true;
    }
  } catch (e) {
    // Try again after delay
  }

  await delayAsync(100);
  return _waitForRunningAsync(url);
}

function _stripPackagerOutputBox(output: string) {
  let re = /Running packager on port (\d+)/;
  let found = output.match(re);
  if (found && found.length >= 2) {
    return `Running packager on port ${found[1]}\n`;
  } else {
    return null;
  }
}

function _processPackagerLine(line: string) {
  // [10:02:59 AM]
  let timestampRe = /\s*\[\d+\:\d+\:\d+\ (AM)?(PM)?\]\s+/;
  // [11/8/2016, 10:02:59 AM]
  let sdk11AndUpTimestampRe = /\s*\[\d+\/\d+\/\d+, \d+\:\d+\:\d+\ (AM)?(PM)?\]\s+/;
  return line.replace(timestampRe, '').replace(sdk11AndUpTimestampRe, '');
}

async function _restartWatchmanAsync(projectRoot: string) {
  try {
    let result = await spawnAsync('watchman', ['watch-del', projectRoot]);
    await spawnAsync('watchman', ['watch-project', projectRoot]);
    if (result.stdout.includes('root')) {
      ProjectUtils.logInfo(projectRoot, 'expo', 'Restarted watchman.');
      return;
    }
  } catch (e) {}

  ProjectUtils.logError(
    projectRoot,
    'expo',
    'Attempted to restart watchman but failed. Please try running `watchman watch-del-all`.'
  );
}

function _logPackagerOutput(projectRoot: string, level: string, data: Object) {
  let output = data.toString();
  if (output.includes('─────')) {
    output = _stripPackagerOutputBox(output);
    if (output) {
      ProjectUtils.logInfo(projectRoot, 'expo', output);
    }
    return;
  }
  if (!output) {
    return;
  } // Fix watchman if it's being dumb
  if (Watchman.isPlatformSupported() && output.includes('watchman watch-del')) {
    _restartWatchmanAsync(projectRoot);
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
  let lines = output.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    lines[i] = _processPackagerLine(lines[i]);
  }
  output = lines.join('\n');
  if (level === 'info') {
    ProjectUtils.logInfo(projectRoot, 'packager', output);
  } else {
    ProjectUtils.logError(projectRoot, 'packager', output);
  }
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
  let reactNativeNodeModulesPattern = _.escapeRegExp(
    reactNativeNodeModulesPath
  );
  let reactNativeNodeModulesCollisionRegex = new RegExp(
    `Paths: ${reactNativeNodeModulesPattern}.+ collides with ${reactNativeNodeModulesPattern}.+`
  );
  return reactNativeNodeModulesCollisionRegex.test(output);
}

function _handleDeviceLogs(
  projectRoot: string,
  deviceId: string,
  deviceName: string,
  logs: any
) {
  for (let i = 0; i < logs.length; i++) {
    let log = logs[i];
    let body = typeof log.body === 'string' ? [log.body] : log.body;
    let string = body
      .map(obj => {
        if (typeof obj === 'undefined') {
          return 'undefined';
        }
        if (obj === 'null') {
          return 'null';
        }
        if (
          typeof obj === 'string' ||
          typeof obj === 'number' ||
          typeof obj === 'boolean'
        ) {
          return obj;
        }
        try {
          return JSON.stringify(obj);
        } catch (e) {
          return obj.toString();
        }
      })
      .join(' ');
    let level = log.level;
    let groupDepth = log.groupDepth;
    let shouldHide = log.shouldHide;
    ProjectUtils.logWithLevel(
      projectRoot,
      level,
      {
        tag: 'device',
        deviceId,
        deviceName,
        groupDepth,
        shouldHide,
      },
      string
    );
  }
}
export async function startReactNativeServerAsync(
  projectRoot: string,
  options: Object = {},
  verbose: boolean = true
) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);
  await stopReactNativeServerAsync(projectRoot);
  await Watchman.addToPathAsync(); // Attempt to fix watchman if it's hanging
  await Watchman.unblockAndGetVersionAsync(projectRoot);
  let packagerPort = await _getFreePortAsync(19001); // Create packager options
  let packagerOpts = {
    port: packagerPort,
    projectRoots: projectRoot,
    customLogReporterPath: 'expo/tools/LogReporter',
    assetExts: ['ttf'],
  };
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  if (!Versions.gteSdkVersion(exp, '16.0.0')) {
    delete packagerOpts.customLogReporterPath;
  }
  const userPackagerOpts = _.get(exp, 'packagerOpts');
  if (userPackagerOpts) {
    // The RN CLI expects rn-cli.config.js's path to be absolute. We use the
    // project root to resolve relative paths since that was the original
    // behavior of the RN CLI.
    if (userPackagerOpts.config) {
      userPackagerOpts.config = path.resolve(
        projectRoot,
        userPackagerOpts.config
      );
    }

    packagerOpts = {
      ...packagerOpts,
      ...userPackagerOpts,
      ...(userPackagerOpts.assetExts
        ? {
            assetExts: _.uniq([
              ...packagerOpts.assetExts,
              ...userPackagerOpts.assetExts,
            ]),
          }
        : {}),
    };
  }
  let cliOpts = _.reduce(
    packagerOpts,
    (opts, val, key) => {
      if (val && val !== '') {
        opts.push(`--${key}`, val);
      }
      return opts;
    },
    ['start']
  );
  if (options.reset) {
    cliOpts.push('--reset-cache');
  } // Get custom CLI path from project package.json, but fall back to node_module path
  let defaultCliPath = path.join(
    projectRoot,
    'node_modules',
    'react-native',
    'local-cli',
    'cli.js'
  );
  const cliPath = _.get(exp, 'rnCliPath', defaultCliPath);
  let nodePath; // When using a custom path for the RN CLI, we want it to use the project // root to look up config files and Node modules
  if (exp.rnCliPath) {
    nodePath = _nodePathForProjectRoot(projectRoot);
  } else {
    nodePath = null;
  }
  ProjectUtils.logInfo(
    projectRoot,
    'expo',
    'Starting React Native packager...'
  ); // Run the copy of Node that's embedded in Electron by setting the // ELECTRON_RUN_AS_NODE environment variable // Note: the CLI script sets up graceful-fs and sets ulimit to 4096 in the // child process
  let packagerProcess = child_process.fork(cliPath, cliOpts, {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_PATH: nodePath,
      ELECTRON_RUN_AS_NODE: 1,
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
  packagerProcess.stdout.setEncoding('utf8');
  packagerProcess.stderr.setEncoding('utf8');
  packagerProcess.stdout.on('data', data => {
    if (verbose) {
      _logPackagerOutput(projectRoot, 'info', data);
    }
  });
  packagerProcess.stderr.on('data', data => {
    if (verbose) {
      _logPackagerOutput(projectRoot, 'error', data);
    }
  });
  packagerProcess.on('exit', async code => {
    ProjectUtils.logDebug(
      projectRoot,
      'expo',
      `packager process exited with code ${code}`
    );
  });
  let packagerUrl = await UrlUtils.constructBundleUrlAsync(projectRoot, {
    urlType: 'http',
    hostType: 'localhost',
  });
  await _waitForRunningAsync(`${packagerUrl}/debug`);
} // Simulate the node_modules resolution // If you project dir is /Jesse/Expo/Universe/BubbleBounce, returns // "/Jesse/node_modules:/Jesse/Expo/node_modules:/Jesse/Expo/Universe/node_modules:/Jesse/Expo/Universe/BubbleBounce/node_modules"
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
export async function stopReactNativeServerAsync(projectRoot: string) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort || !packagerInfo.packagerPid) {
    ProjectUtils.logDebug(
      projectRoot,
      'expo',
      `No packager found for project at ${projectRoot}.`
    );
    return;
  }
  ProjectUtils.logDebug(
    projectRoot,
    'expo',
    `Killing packager process tree: ${packagerInfo.packagerPid}`
  );
  try {
    await treekill.promise(packagerInfo.packagerPid, 'SIGKILL');
  } catch (e) {
    ProjectUtils.logDebug(
      projectRoot,
      'expo',
      `Error stopping packager process: ${e.toString()}`
    );
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    packagerPort: null,
    packagerPid: null,
  });
}
export async function startExpoServerAsync(projectRoot: string) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);
  await stopExpoServerAsync(projectRoot);
  let app = express();
  app.use(
    bodyParser.json({
      limit: '10mb',
    })
  );
  app.use(
    bodyParser.urlencoded({
      limit: '10mb',
      extended: true,
    })
  );
  if ((await Doctor.validateWithNetworkAsync(projectRoot)) === Doctor.FATAL) {
    throw new Error(
      `Couldn't start project. Please fix the errors and restart the project.`
    );
  } // Serve the manifest.
  let manifestHandler = async (req, res) => {
    try {
      // We intentionally don't `await`. We want to continue trying even
      // if there is a potential error in the package.json and don't want to slow
      // down the request
      Doctor.validateWithNetworkAsync(projectRoot);
      let { exp: manifest } = await ProjectUtils.readConfigJsonAsync(
        projectRoot
      );
      if (!manifest) {
        const configName = await ProjectUtils.configFilenameAsync(projectRoot);
        throw new Error(`No ${configName} file found`);
      } // Get packager opts and then copy into bundleUrlPackagerOpts
      let packagerOpts = await ProjectSettings.getPackagerOptsAsync(
        projectRoot
      );
      let bundleUrlPackagerOpts = JSON.parse(JSON.stringify(packagerOpts));
      bundleUrlPackagerOpts.urlType = 'http';
      if (bundleUrlPackagerOpts.hostType === 'redirect') {
        bundleUrlPackagerOpts.hostType = 'tunnel';
      }
      manifest.xde = true; // deprecated
      manifest.developer = {
        tool: Config.developerTool,
      };
      manifest.packagerOpts = packagerOpts;
      manifest.env = {};
      for (let key of Object.keys(process.env)) {
        if (key.startsWith('REACT_NATIVE_') || key.startsWith('EXPO_')) {
          manifest.env[key] = process.env[key];
        }
      }
      let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
      let platform = req.headers['exponent-platform'] || 'ios';
      entryPoint = UrlUtils.getPlatformSpecificBundleUrl(entryPoint, platform);
      let mainModuleName = UrlUtils.guessMainModulePath(entryPoint);
      let queryParams = await UrlUtils.constructBundleQueryParamsAsync(
        projectRoot,
        packagerOpts,
        req.hostname
      );
      let path = `/${mainModuleName}.bundle?platform=${platform}&${queryParams}`;
      manifest.bundleUrl =
        (await UrlUtils.constructBundleUrlAsync(
          projectRoot,
          bundleUrlPackagerOpts,
          req.hostname
        )) + path;
      manifest.debuggerHost = await UrlUtils.constructDebuggerHostAsync(
        projectRoot,
        req.hostname
      );
      manifest.mainModuleName = mainModuleName;
      manifest.logUrl = `${await UrlUtils.constructManifestUrlAsync(
        projectRoot,
        { urlType: 'http' },
        req.hostname
      )}/logs`; // Resolve manifest assets to their packager URL
      await _resolveManifestAssets(
        projectRoot,
        manifest,
        async path =>
          manifest.bundleUrl.match(/^https?:\/\/.*?\//)[0] + 'assets/' + path
      ); // the server normally inserts this but if we're offline we'll do it here
      const hostUUID = await UserSettings.anonymousIdentifier();
      if (Config.offline) {
        manifest.id = `@anonymous/${manifest.slug}-${hostUUID}`;
      }
      let manifestString = JSON.stringify(manifest);
      let currentUser;
      if (!Config.offline) {
        currentUser = await UserManager.getCurrentUserAsync();
      }
      if (
        req.headers['exponent-accept-signature'] &&
        (currentUser || Config.offline)
      ) {
        if (_cachedSignedManifest.manifestString === manifestString) {
          manifestString = _cachedSignedManifest.signedManifest;
        } else {
          if (Config.offline) {
            const unsignedManifest = {
              manifestString,
              signature: 'UNSIGNED',
            };
            _cachedSignedManifest.manifestString = manifestString;
            manifestString = JSON.stringify(unsignedManifest);
            _cachedSignedManifest.signedManifest = manifestString;
          } else {
            let publishInfo = await Exp.getPublishInfoAsync(projectRoot);
            let signedManifest = await Api.callMethodAsync(
              'signManifest',
              [publishInfo.args],
              'post',
              manifest
            );
            _cachedSignedManifest.manifestString = manifestString;
            _cachedSignedManifest.signedManifest = signedManifest.response;
            manifestString = signedManifest.response;
          }
        }
      }
      const hostInfo = {
        host: hostUUID,
        server: 'xdl',
        serverVersion: require('../package.json').version,
        serverDriver: Config.developerTool,
        serverOS: os.platform(),
        serverOSVersion: os.release(),
      };
      res.append('Exponent-Server', JSON.stringify(hostInfo));
      res.send(manifestString);
      Analytics.logEvent('Serve Manifest', {
        projectRoot,
      });
    } catch (e) {
      ProjectUtils.logDebug(
        projectRoot,
        'expo',
        `Error in manifestHandler: ${e} ${e.stack}`
      ); // 5xx = Server Error HTTP code
      res.status(520).send({
        error: e.toString(),
      });
    }
  };
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
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error getting device logs: ${e} ${e.stack}`
      );
    }
    res.send('Success');
  });
  app.post('/shutdown', async (req, res) => {
    server.close();
    res.send('Success');
  });
  let expRc = await ProjectUtils.readExpRcAsync(projectRoot);
  let expoServerPort = expRc.manifestPort
    ? expRc.manifestPort
    : await _getFreePortAsync(19000);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort,
  });
  let server = app.listen(expoServerPort, () => {
    let host = server.address().address;
    let port = server.address().port;
    ProjectUtils.logDebug(
      projectRoot,
      'expo',
      `Local server listening at http://${host}:${port}`
    );
  });
  await Exp.saveRecentExpRootAsync(projectRoot);
}
export async function stopExpoServerAsync(projectRoot: string) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (packagerInfo && packagerInfo.expoServerPort) {
    try {
      await request.post.promise(
        `http://localhost:${packagerInfo.expoServerPort}/shutdown`
      );
    } catch (e) {}
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: null,
  });
}
async function _connectToNgrokAsync(
  projectRoot: string,
  args: mixed,
  hostnameAsync: Function,
  ngrokPid: ?number,
  attempts: number = 0
) {
  try {
    let configPath = path.join(
      UserSettings.dotExpoHomeDirectory(),
      'ngrok.yml'
    );
    let hostname = await hostnameAsync();
    let url = await ngrok.promise.connect({
      hostname,
      configPath,
      ...args,
    });
    return url;
  } catch (e) {
    // Attempt to connect 3 times
    if (attempts >= 2) {
      if (e.message) {
        throw new XDLError(ErrorCode.NGROK_ERROR, e.toString());
      } else {
        throw new XDLError(ErrorCode.NGROK_ERROR, JSON.stringify(e));
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
            ProjectUtils.logDebug(
              projectRoot,
              'expo',
              `Couldn't kill ngrok with PID ${ngrokPid}`
            );
          }
        } else {
          await ngrok.promise.kill();
        }
      } else {
        // Change randomness to avoid conflict if killing ngrok didn't help
        await Exp.resetProjectRandomnessAsync(projectRoot);
      }
    } // Wait 100ms and then try again
    await delayAsync(100);
    return _connectToNgrokAsync(
      projectRoot,
      args,
      hostnameAsync,
      null,
      attempts + 1
    );
  }
}
export async function startTunnelsAsync(projectRoot: string) {
  const user = await UserManager.ensureLoggedInAsync();
  if (!user) {
    throw new Error('Internal error -- tunnel started in offline mode.');
  }
  _assertValidProjectRoot(projectRoot);
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort) {
    throw new XDLError(
      ErrorCode.NO_PACKAGER_PORT,
      `No packager found for project at ${projectRoot}.`
    );
  }
  if (!packagerInfo.expoServerPort) {
    throw new XDLError(
      ErrorCode.NO_EXPO_SERVER_PORT,
      `No Expo server found for project at ${projectRoot}.`
    );
  }
  await stopTunnelsAsync(projectRoot);
  if (await Android.startAdbReverseAsync(projectRoot)) {
    ProjectUtils.logInfo(
      projectRoot,
      'expo',
      'Sucessfully ran `adb reverse`. Localhost urls should work on the connected Android device.',
      'project-adb-reverse'
    );
  } else {
    ProjectUtils.clearNotification(projectRoot, 'project-adb-reverse');
  }
  const { username } = user;
  let packageShortName = path.parse(projectRoot).base;
  let expRc = await ProjectUtils.readExpRcAsync(projectRoot);
  try {
    let expoServerNgrokUrl = await _connectToNgrokAsync(
      projectRoot,
      {
        authtoken: Config.ngrok.authToken,
        port: packagerInfo.expoServerPort,
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
  } catch (e) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error starting tunnel: ${e.toString()}`
    );
    throw e;
  }
}
export async function stopTunnelsAsync(projectRoot: string) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot); // This will kill all ngrok tunnels in the process. // We'll need to change this if we ever support more than one project // open at a time in XDE.
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  let ngrokProcess = ngrok.process();
  let ngrokProcessPid = ngrokProcess ? ngrokProcess.pid : null;
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
    await ngrok.promise.kill();
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
    packagerPort?: number,
  }
) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot); // Check to make sure all options are valid
  let schema = joi.object().keys({
    packagerPort: joi.number().integer(),
  });
  try {
    await joi.promise.validate(options, schema);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, options);
}
export async function getUrlAsync(projectRoot: string, options: Object = {}) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);
  return await UrlUtils.constructManifestUrlAsync(projectRoot, options);
}
export async function startAsync(
  projectRoot: string,
  options: Object = {},
  verbose: boolean = true
): Promise<any> {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);
  Analytics.logEvent('Start Project', {
    projectRoot,
  });
  await startExpoServerAsync(projectRoot);
  await startReactNativeServerAsync(projectRoot, options, verbose);
  if (!Config.offline) {
    try {
      await startTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(
        projectRoot,
        'expo',
        `Error starting ngrok ${e.message}`
      );
    }
  }
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  return exp;
}
async function _stopInternalAsync(projectRoot: string): Promise<void> {
  await stopExpoServerAsync(projectRoot);
  await stopReactNativeServerAsync(projectRoot);
  if (!Config.offline) {
    try {
      await stopTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(
        projectRoot,
        'expo',
        `Error stopping ngrok ${e.message}`
      );
    }
  }
}
export async function stopAsync(projectDir: string): Promise<void> {
  const result = await Promise.race([
    _stopInternalAsync(projectDir),
    new Promise((resolve, reject) => setTimeout(resolve, 2000, 'stopFailed')),
  ]);
  if (result === 'stopFailed') {
    // find RN packager and ngrok pids, attempt to kill them manually
    const {
      packagerPid,
      ngrokPid,
    } = await ProjectSettings.readPackagerInfoAsync(projectDir);
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
    });
  }
}
