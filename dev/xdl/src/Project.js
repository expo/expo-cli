/**
 * @flow
 */

import bodyParser from 'body-parser';
import child_process from 'child_process';
import delayAsync from 'delay-async';
import decache from 'decache';
import express from 'express';
import freeportAsync from 'freeport-async';
import fs from 'fs-extra';
import joi from 'joi';
import promisify from 'util.promisify';
import _ from 'lodash';
import minimatch from 'minimatch';
import ngrok from '@expo/ngrok';
import os from 'os';
import path from 'path';
import Request from 'request-promise-native';
import spawnAsync from '@expo/spawn-async';
import split from 'split';
import treekill from 'tree-kill';
import md5hex from 'md5hex';
import url from 'url';
import urljoin from 'url-join';
import readLastLines from 'read-last-lines';

import * as Analytics from './Analytics';
import * as Android from './Android';
import Api from './Api';
import Config from './Config';
import * as Doctor from './project/Doctor';
import * as DevSession from './DevSession';
import ErrorCode from './ErrorCode';
import logger from './Logger';
import * as ExponentTools from './detach/ExponentTools';
import * as Exp from './Exp';
import * as ExpSchema from './project/ExpSchema';
import FormData from './tools/FormData';
import { isNode } from './tools/EnvironmentHelper';
import * as ProjectSettings from './ProjectSettings';
import * as ProjectUtils from './project/ProjectUtils';
import * as Sentry from './Sentry';
import * as UrlUtils from './UrlUtils';
import UserManager from './User';
import UserSettings from './UserSettings';
import * as Versions from './Versions';
import * as Watchman from './Watchman';
import XDLError from './XDLError';

import type { User as ExpUser } from './User'; //eslint-disable-line

const EXPO_CDN = 'https://d1wp6m56sqw74a.cloudfront.net';
const MINIMUM_BUNDLE_SIZE = 500;
const TUNNEL_TIMEOUT = 10 * 1000;
const WAIT_FOR_PACKAGER_TIMEOUT = 30 * 1000;

const joiValidateAsync = promisify(joi.validate);
const treekillAsync = promisify(treekill);
const ngrokConnectAsync = promisify(ngrok.connect);
const ngrokKillAsync = promisify(ngrok.kill);
const stat = promisify(fs.stat);
const truncate = promisify(fs.truncate);
const appendFile = promisify(fs.appendFile);

const request = Request.defaults({
  resolveWithFullResponse: true,
});

type CachedSignedManifest = {
  manifestString: ?string,
  signedManifest: ?string,
};

let _cachedSignedManifest: CachedSignedManifest = {
  manifestString: null,
  signedManifest: null,
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
export async function getManifestUrlWithFallbackAsync(projectRoot: string) {
  return {
    url: await UrlUtils.constructManifestUrlAsync(projectRoot),
    isUrlFallback: false,
  };
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

async function _getForPlatformAsync(projectRoot, url, platform, { errorCode, minLength }) {
  url = UrlUtils.getPlatformSpecificBundleUrl(url, platform);

  let fullUrl = `${url}&platform=${platform}`;
  let response = await request.get({
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

async function _resolveGoogleServicesFile(projectRoot, manifest) {
  if (manifest.android && manifest.android.googleServicesFile) {
    const contents = await fs.readFile(
      path.resolve(projectRoot, manifest.android.googleServicesFile),
      'utf8'
    );
    manifest.android.googleServicesFile = contents;
  }
}

async function _resolveManifestAssets(projectRoot, manifest, resolver, strict = false) {
  try {
    // Asset fields that the user has set
    const assetSchemas = (await ExpSchema.getAssetSchemasAsync(
      manifest.sdkVersion
    )).filter(({ fieldPath }) => _.get(manifest, fieldPath));

    // Get the URLs
    const urls = await Promise.all(
      assetSchemas.map(async ({ fieldPath }) => {
        const pathOrURL = _.get(manifest, fieldPath);
        if (pathOrURL.match(/^https?:\/\/(.*)$/)) {
          // It's a remote URL
          return pathOrURL;
        } else if (fs.existsSync(path.resolve(projectRoot, pathOrURL))) {
          return await resolver(pathOrURL);
        } else {
          const err = new Error('Could not resolve local asset.');
          // $FlowFixMe
          err.localAssetPath = pathOrURL;
          // $FlowFixMe
          err.manifestField = fieldPath;
          throw err;
        }
      })
    );

    // Set the corresponding URL fields
    assetSchemas.forEach(({ fieldPath }, index) => _.set(manifest, fieldPath + 'Url', urls[index]));
  } catch (e) {
    let logMethod = ProjectUtils.logWarning;
    if (strict) {
      logMethod = ProjectUtils.logError;
    }
    if (e.localAssetPath) {
      logMethod(
        projectRoot,
        'expo',
        `Unable to resolve asset "${e.localAssetPath}" from "${e.manifestField}" in your app/exp.json.`
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

export async function getSlugAsync(projectRoot: string, options: Object = {}) {
  // Verify that exp/app.json exist
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  if (!exp || !pkg) {
    const configName = await ProjectUtils.configFilenameAsync(projectRoot);
    throw new XDLError(
      ErrorCode.NO_PACKAGE_JSON,
      `Couldn't read ${configName} file in project at ${projectRoot}`
    );
  }

  if (!exp.slug && pkg.name) {
    exp.slug = pkg.name;
  } else if (!exp.slug) {
    const configName = await ProjectUtils.configFilenameAsync(projectRoot);
    throw new XDLError(
      ErrorCode.INVALID_MANIFEST,
      `${configName} in ${projectRoot} must contain the slug field`
    );
  }
  return exp.slug;
}

export async function getLatestReleaseAsync(
  projectRoot: string,
  options: {
    releaseChannel: string,
    platform: string,
  }
) {
  // TODO(ville): move request from multipart/form-data to JSON once supported by the endpoint.
  let formData = new FormData();
  formData.append('queryType', 'history');
  formData.append('slug', await getSlugAsync(projectRoot));
  formData.append('version', '2');
  formData.append('count', '1');
  formData.append('releaseChannel', options.releaseChannel);
  formData.append('platform', options.platform);
  const { queryResult } = await Api.callMethodAsync('publishInfo', [], 'post', null, {
    formData,
  });
  if (queryResult && queryResult.length > 0) {
    return queryResult[0];
  } else {
    return null;
  }
}

/**
 * Apps exporting for self hosting will have the files created in the project directory the following way:
.
├── android-index.exp
├── android.js
├── assets
│   ├── 004c2bbb035d8d06bb830efc4673c886
│   └── 1eccbc4c41d49fd81840aef3eaabe862
├── ios-index.exp
└── ios.js
 */
export async function exportForAppHosting(
  projectRoot: string,
  publicUrl: string,
  assetUrl: string,
  outputDir: string,
  options: {} = {}
) {
  await _validatePackagerReadyAsync(projectRoot);

  // make output dir if not exists
  const pathToWrite = path.resolve(projectRoot, path.join(outputDir, 'assets'));
  await fs.ensureDir(pathToWrite);

  // build the bundles
  let packagerOpts = {};
  if (options.isDev) {
    packagerOpts = { dev: true, minify: false };
  }
  let { iosBundle, androidBundle } = await _buildPublishBundlesAsync(projectRoot, packagerOpts);
  await _writeArtifactSafelyAsync(projectRoot, null, path.join(outputDir, 'ios.js'), iosBundle);
  await _writeArtifactSafelyAsync(
    projectRoot,
    null,
    path.join(outputDir, 'android.js'),
    androidBundle
  );
  logger.global.info('Finished saving JS Bundles.');

  // save the assets
  // Get project config
  const publishOptions = options.publishOptions || {};
  const exp = await _getPublishExpConfigAsync(projectRoot, publishOptions);
  const { assets } = await _fetchAndSaveAssetsAsync(projectRoot, exp, publicUrl, outputDir);

  if (options.dumpAssetmap) {
    logger.global.info('Dumping asset map.');
    const assetmap = {};
    assets.forEach(asset => {
      assetmap[asset.hash] = asset;
    });
    await _writeArtifactSafelyAsync(
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

  // TODO(quin): follow up and write a doc page that explains these fields that users don't specify in app.json
  exp.publishedTime = new Date().toISOString();
  exp.slug = 'selfhost';

  if (options.isDev) {
    exp.developer = {
      tool: 'exp',
    };
  }

  if (!exp.slug) {
    throw new XDLError(
      ErrorCode.INVALID_MANIFEST,
      'Must provide a slug field in the app.json manifest.'
    );
  }
  const user = await UserManager.ensureLoggedInAsync();
  exp.id = `@${user.username}/${exp.slug}`;

  // save the android manifest
  exp.bundleUrl = urljoin(publicUrl, 'android.js');
  await _writeArtifactSafelyAsync(
    projectRoot,
    null,
    path.join(outputDir, 'android-index.exp'),
    JSON.stringify(exp)
  );

  // save the ios manifest
  exp.bundleUrl = urljoin(publicUrl, 'ios.js');
  await _writeArtifactSafelyAsync(
    projectRoot,
    null,
    path.join(outputDir, 'ios-index.exp'),
    JSON.stringify(exp)
  );

  // build source maps
  if (options.dumpSourcemap) {
    const { iosSourceMap, androidSourceMap } = await _maybeBuildSourceMapsAsync(projectRoot, exp, {
      force: true,
    });
    // write the sourcemap files
    const iosMapPath = path.join(outputDir, 'ios.map');
    const iosJsPath = path.join(outputDir, 'ios.js');
    await _writeArtifactSafelyAsync(projectRoot, null, iosMapPath, iosSourceMap);

    const androidMapPath = path.join(outputDir, 'android.map');
    const androidJsPath = path.join(outputDir, 'android.js');
    await _writeArtifactSafelyAsync(projectRoot, null, androidMapPath, androidSourceMap);

    // Remove original mapping to incorrect sourcemap paths
    logger.global.info('Configuring sourcemaps');
    await truncateLastNLines(iosJsPath, 1);
    await truncateLastNLines(androidJsPath, 1);

    // Add correct mapping to sourcemap paths
    await appendFile(iosJsPath, '\n//# sourceMappingURL=ios.map');
    await appendFile(androidJsPath, '\n//# sourceMappingURL=android.map');

    // Make a debug html so user can debug their bundles
    logger.global.info('Preparing additional debugging files');
    const debugHtml = `
    <script src="ios.js"></script>
    <script src="android.js"></script>
    Open up this file in Chrome. In the Javascript developer console, navigate to the Source tab.
    You can see a red coloured folder containing the original source code from your bundle. 
    `;
    await _writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(outputDir, 'debug.html'),
      debugHtml
    );
  }
}

// truncate the last n lines in a file
async function truncateLastNLines(filePath: string, n: number) {
  const lines = await readLastLines.read(filePath, n);
  const to_vanquish = lines.length;
  const { size } = await stat(filePath);
  await truncate(filePath, size - to_vanquish);
}

async function _saveAssetAsync(projectRoot, assets, outputDir) {
  // Collect paths by key, also effectively handles duplicates in the array
  const paths = {};
  assets.forEach(asset => {
    asset.files.forEach((path, index) => {
      paths[asset.fileHashes[index]] = path;
    });
  });

  // save files one chunk at a time
  const keyChunks = _.chunk(Object.keys(paths), 5);
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

export async function publishAsync(
  projectRoot: string,
  options: Object = {}
): Promise<{ url: string, ids: string[], err: ?string }> {
  const user = await UserManager.ensureLoggedInAsync();
  await _validatePackagerReadyAsync(projectRoot);
  Analytics.logEvent('Publish', {
    projectRoot,
    developerTool: Config.developerTool,
  });

  const validationStatus = await Doctor.validateWithNetworkAsync(projectRoot);
  if (validationStatus == Doctor.ERROR || validationStatus === Doctor.FATAL) {
    throw new XDLError(
      ErrorCode.PUBLISH_VALIDATION_ERROR,
      "Couldn't publish because errors were found. (See logs above.) Please fix the errors and try again."
    );
  }

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

  let { iosBundle, androidBundle } = await _buildPublishBundlesAsync(projectRoot);

  await _fetchAndUploadAssetsAsync(projectRoot, exp);

  let { iosSourceMap, androidSourceMap } = await _maybeBuildSourceMapsAsync(projectRoot, exp, {
    force: validPostPublishHooks.length,
  });

  let response;
  try {
    response = await _uploadArtifactsAsync({
      exp,
      iosBundle,
      androidBundle,
      options,
    });
  } catch (e) {
    if (e.serverError === 'SCHEMA_VALIDATION_ERROR') {
      throw new Error(
        `There was an error validating your project schema. Check for any warnings about the contents of your app/exp.json.`
      );
    }
    Sentry.captureException(e);
    throw e;
  }

  await _maybeWriteArtifactsToDiskAsync({
    exp,
    projectRoot,
    iosBundle,
    androidBundle,
    iosSourceMap,
    androidSourceMap,
  });

  if (
    validPostPublishHooks.length ||
    (exp.ios && exp.ios.publishManifestPath) ||
    (exp.android && exp.android.publishManifestPath)
  ) {
    let [androidManifest, iosManifest] = await Promise.all([
      ExponentTools.getManifestAsync(response.url, {
        'Exponent-SDK-Version': exp.sdkVersion,
        'Exponent-Platform': 'android',
        'Expo-Release-Channel': options.releaseChannel,
      }),
      ExponentTools.getManifestAsync(response.url, {
        'Exponent-SDK-Version': exp.sdkVersion,
        'Exponent-Platform': 'ios',
        'Expo-Release-Channel': options.releaseChannel,
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
        logger.global.warn(`Warning: postPublish hook '${hook.file}' failed: ${e.stack}`);
      }
    }

    if (exp.ios && exp.ios.publishManifestPath) {
      await _writeArtifactSafelyAsync(
        projectRoot,
        'ios.publishManifestPath',
        exp.ios.publishManifestPath,
        JSON.stringify(iosManifest)
      );
    }

    if (exp.android && exp.android.publishManifestPath) {
      await _writeArtifactSafelyAsync(
        projectRoot,
        'android.publishManifestPath',
        exp.android.publishManifestPath,
        JSON.stringify(androidManifest)
      );
    }

    // We need to add EmbeddedResponse instances on Android to tell the runtime
    // that the shell app manifest and bundle is packaged.
    if (exp.android && exp.android.publishManifestPath && exp.android.publishBundlePath) {
      let fullManifestUrl = `${response.url.replace('exp://', 'https://')}/index.exp`;
      let constantsPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'AppConstants.java'
      );
      await ExponentTools.deleteLinesInFileAsync(
        `START EMBEDDED RESPONSES`,
        `END EMBEDDED RESPONSES`,
        constantsPath
      );
      await ExponentTools.regexFileAsync(
        '// ADD EMBEDDED RESPONSES HERE',
        `
        // ADD EMBEDDED RESPONSES HERE
        // START EMBEDDED RESPONSES
        embeddedResponses.add(new Constants.EmbeddedResponse("${fullManifestUrl}", "assets://shell-app-manifest.json", "application/json"));
        embeddedResponses.add(new Constants.EmbeddedResponse("${androidManifest.bundleUrl}", "assets://shell-app.bundle", "application/javascript"));
        // END EMBEDDED RESPONSES`,
        constantsPath
      );
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

  return {
    ...response,
    url:
      options.releaseChannel && options.releaseChannel !== 'default'
        ? `${response.url}?release-channel=${options.releaseChannel}`
        : response.url,
  };
}

async function _uploadArtifactsAsync({ exp, iosBundle, androidBundle, options }) {
  logger.global.info('Uploading JavaScript bundles');
  let formData = new FormData();

  formData.append('expJson', JSON.stringify(exp));
  formData.append('iosBundle', _createBlob(iosBundle), 'iosBundle');
  formData.append('androidBundle', _createBlob(androidBundle), 'androidBundle');
  formData.append('options', JSON.stringify(options));
  let response = await Api.callMethodAsync('publish', null, 'put', null, {
    formData,
  });
  return response;
}

async function _validatePackagerReadyAsync(projectRoot) {
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

async function _getPublishExpConfigAsync(projectRoot, options) {
  let schema = joi.object().keys({
    releaseChannel: joi.string(),
  });

  // Validate schema
  try {
    await joiValidateAsync(options, schema);
    options.releaseChannel = options.releaseChannel || 'default'; // joi default not enforcing this :/
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

  // Only allow projects to be published with UNVERSIONED if a correct token is set in env
  if (exp.sdkVersion === 'UNVERSIONED' && !process.env['EXPO_SKIP_MANIFEST_VALIDATION_TOKEN']) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, 'Cannot publish with sdkVersion UNVERSIONED.');
  }
  exp.locales = await ExponentTools.getResolvedLocalesAsync(exp);
  return exp;
}

// Fetch iOS and Android bundles for publishing
async function _buildPublishBundlesAsync(projectRoot, opts?: Object) {
  let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
  let publishUrl = await UrlUtils.constructPublishUrlAsync(projectRoot, entryPoint, null, opts);

  logger.global.info('Building iOS bundle');
  let iosBundle = await _getForPlatformAsync(projectRoot, publishUrl, 'ios', {
    errorCode: ErrorCode.INVALID_BUNDLE,
    minLength: MINIMUM_BUNDLE_SIZE,
  });

  logger.global.info('Building Android bundle');
  let androidBundle = await _getForPlatformAsync(projectRoot, publishUrl, 'android', {
    errorCode: ErrorCode.INVALID_BUNDLE,
    minLength: MINIMUM_BUNDLE_SIZE,
  });

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
  let sourceMapUrl = await UrlUtils.constructSourceMapUrlAsync(projectRoot, entryPoint);

  logger.global.info('Building sourcemaps');
  let iosSourceMap = await _getForPlatformAsync(projectRoot, sourceMapUrl, 'ios', {
    errorCode: ErrorCode.INVALID_BUNDLE,
    minLength: MINIMUM_BUNDLE_SIZE,
  });

  let androidSourceMap = await _getForPlatformAsync(projectRoot, sourceMapUrl, 'android', {
    errorCode: ErrorCode.INVALID_BUNDLE,
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
async function _collectAssets(projectRoot, exp, hostedAssetPrefix) {
  let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
  let assetsUrl = await UrlUtils.constructAssetsUrlAsync(projectRoot, entryPoint);

  let iosAssetsJson = await _getForPlatformAsync(projectRoot, assetsUrl, 'ios', {
    errorCode: ErrorCode.INVALID_ASSETS,
  });

  let androidAssetsJson = await _getForPlatformAsync(projectRoot, assetsUrl, 'android', {
    errorCode: ErrorCode.INVALID_ASSETS,
  });

  // Resolve manifest assets to their hosted URL and add them to the list of assets to
  // be uploaded. Modifies exp.
  const manifestAssets = [];
  await _resolveManifestAssets(
    projectRoot,
    exp,
    async assetPath => {
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
async function _configureExpForAssets(projectRoot, exp, assets) {
  // Add google services file if it exists
  await _resolveGoogleServicesFile(projectRoot, exp);

  // Convert asset patterns to a list of asset strings that match them.
  // Assets strings are formatted as `asset_<hash>.<type>` and represent
  // the name that the file will have in the app bundle. The `asset_` prefix is
  // needed because android doesn't support assets that start with numbers.
  if (exp.assetBundlePatterns) {
    const fullPatterns = exp.assetBundlePatterns.map(p => path.join(projectRoot, p));
    logger.global.info('Processing asset bundle patterns:');
    fullPatterns.forEach(p => logger.global.info('- ' + p));
    // The assets returned by the RN packager has duplicates so make sure we
    // only bundle each once.
    const bundledAssets = new Set();
    for (const asset of assets) {
      const file = asset.files && asset.files[0];
      const shouldBundle =
        asset.__packager_asset && file && fullPatterns.some(p => minimatch(file, p));
      ProjectUtils.logDebug(
        projectRoot,
        'expo',
        `${shouldBundle ? 'Include' : 'Exclude'} asset ${file}`
      );
      if (shouldBundle) {
        asset.fileHashes.forEach(hash =>
          bundledAssets.add('asset_' + hash + (asset.type ? '.' + asset.type : ''))
        );
      }
    }
    exp.bundledAssets = [...bundledAssets];
    delete exp.assetBundlePatterns;
  }

  return exp;
}

async function _fetchAndUploadAssetsAsync(projectRoot, exp) {
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

async function _fetchAndSaveAssetsAsync(projectRoot, exp, hostedUrl, outputDir) {
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

async function _writeArtifactSafelyAsync(projectRoot, keyName, artifactPath, artifact) {
  const pathToWrite = path.resolve(projectRoot, artifactPath);
  if (!fs.existsSync(path.dirname(pathToWrite))) {
    const errorMsg = keyName
      ? `app.json specifies: ${pathToWrite}, but that directory does not exist.`
      : `app.json specifies ${keyName}: ${pathToWrite}, but that directory does not exist.`;
    logger.global.warn(errorMsg);
  } else {
    await fs.writeFile(pathToWrite, artifact);
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
    await _writeArtifactSafelyAsync(
      projectRoot,
      'android.publishBundlePath',
      exp.android.publishBundlePath,
      androidBundle
    );
  }

  if (exp.ios && exp.ios.publishBundlePath) {
    await _writeArtifactSafelyAsync(
      projectRoot,
      'ios.publishBundlePath',
      exp.ios.publishBundlePath,
      iosBundle
    );
  }

  if (exp.android && exp.android.publishSourceMapPath) {
    await _writeArtifactSafelyAsync(
      projectRoot,
      'android.publishSourceMapPath',
      exp.android.publishSourceMapPath,
      androidSourceMap
    );
  }

  if (exp.ios && exp.ios.publishSourceMapPath) {
    await _writeArtifactSafelyAsync(
      projectRoot,
      'ios.publishSourceMapPath',
      exp.ios.publishSourceMapPath,
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
    await fs.writeFile(
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
    await fs.writeFile(
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
      let formData = new FormData();
      for (const key of keys) {
        ProjectUtils.logDebug(projectRoot, 'expo', `uploading ${paths[key]}`);

        let relativePath = paths[key].replace(projectRoot, '');
        logger.global.info({ quiet: true }, `Uploading ${relativePath}`);

        formData.append(key, await _readFileForUpload(paths[key]), paths[key]);
      }
      await Api.callMethodAsync('uploadAssets', [], 'put', null, { formData });
    })
  );
}

function _createBlob(string) {
  if (isNode()) {
    return string;
  } else {
    return new Blob([string]);
  }
}

async function _readFileForUpload(path) {
  if (isNode()) {
    return fs.createReadStream(path);
  } else {
    const data = await fs.readFile(path);
    return new Blob([data]);
  }
}

export async function buildAsync(
  projectRoot: string,
  options: {
    current?: boolean,
    mode?: string,
    platform?: string,
    expIds?: Array<string>,
    type?: string,
    releaseChannel?: string,
    bundleIdentifier?: string,
  } = {}
) {
  await UserManager.ensureLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  Analytics.logEvent('Build Shell App', {
    projectRoot,
    developerTool: Config.developerTool,
    platform: options.platform,
  });

  let schema = joi.object().keys({
    current: joi.boolean(),
    mode: joi.string(),
    platform: joi.any().valid('ios', 'android', 'all'),
    expIds: joi.array(),
    type: joi.any().valid('archive', 'simulator', 'client'),
    releaseChannel: joi.string().regex(/[a-z\d][a-z\d._-]*/),
    bundleIdentifier: joi.string().regex(/^[a-zA-Z][a-zA-Z0-9\-\.]+$/),
  });

  try {
    await joiValidateAsync(options, schema);
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

  if (process.env.FORCE_TURTLE_VERSION) {
    options.forceTurtleVersion = process.env.FORCE_TURTLE_VERSION;
  }

  let response = await Api.callMethodAsync('build', [], 'put', {
    manifest: exp,
    options,
  });

  return response;
}

async function _waitForRunningAsync(url) {
  try {
    let response = await request(url);
    // Looking for "Cached Bundles" string is hacky, but unfortunately
    // ngrok returns a 200 when it succeeds but the port it's proxying
    // isn't bound.
    if (
      response.statusCode >= 200 &&
      response.statusCode < 300 &&
      response.body &&
      response.body.includes('packager-status:running')
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

function _logPackagerOutput(projectRoot: string, level: string, data: Object) {
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
  let reactNativeNodeModulesPattern = _.escapeRegExp(reactNativeNodeModulesPath);
  let reactNativeNodeModulesCollisionRegex = new RegExp(
    `Paths: ${reactNativeNodeModulesPattern}.+ collides with ${reactNativeNodeModulesPattern}.+`
  );
  return reactNativeNodeModulesCollisionRegex.test(output);
}

function _isIgnorableBugReportingExtraData(body) {
  return body.length === 2 && body[0] === 'BugReporting extraData:';
}

function _handleDeviceLogs(projectRoot: string, deviceId: string, deviceName: string, logs: any) {
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
        if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
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
    if (_isIgnorableBugReportingExtraData(body)) {
      level = logger.DEBUG;
    }
    let groupDepth = log.groupDepth;
    let shouldHide = log.shouldHide;
    let includesStack = log.includesStack;
    ProjectUtils.logWithLevel(
      projectRoot,
      level,
      {
        tag: 'device',
        deviceId,
        deviceName,
        groupDepth,
        shouldHide,
        includesStack,
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
  _assertValidProjectRoot(projectRoot);
  await stopReactNativeServerAsync(projectRoot);
  await Watchman.addToPathAsync(); // Attempt to fix watchman if it's hanging
  await Watchman.unblockAndGetVersionAsync(projectRoot);

  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);

  let packagerPort = await _getFreePortAsync(19001); // Create packager options
  let nodeModulesPath = exp.nodeModulesPath
    ? path.join(path.resolve(projectRoot, exp.nodeModulesPath), 'node_modules')
    : path.join(projectRoot, 'node_modules');
  let packagerOpts = {
    port: packagerPort,
    customLogReporterPath: path.join(nodeModulesPath, 'expo', 'tools', 'LogReporter'),
    assetExts: ['ttf'],
    nonPersistent: !!options.nonPersistent,
  };

  if (options.maxWorkers) {
    packagerOpts['max-workers'] = options.maxWorkers;
  }

  if (!Versions.gteSdkVersion(exp, '16.0.0')) {
    delete packagerOpts.customLogReporterPath;
  }
  const userPackagerOpts = _.get(exp, 'packagerOpts');
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
      ...(userPackagerOpts.assetExts
        ? {
            assetExts: _.uniq([...packagerOpts.assetExts, ...userPackagerOpts.assetExts]),
          }
        : {}),
    };

    if (userPackagerOpts.port !== undefined && userPackagerOpts.port !== null) {
      packagerPort = userPackagerOpts.port;
    }
  }
  let cliOpts = _.reduce(
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
  // Run the copy of Node that's embedded in Electron by setting the // ELECTRON_RUN_AS_NODE environment variable // Note: the CLI script sets up graceful-fs and sets ulimit to 4096 in the // child process
  let packagerProcess = child_process.fork(cliPath, cliOpts, {
    cwd: projectRoot,
    env: {
      ...process.env,
      REACT_NATIVE_APP_ROOT: projectRoot,
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
      reject(new Error(`Metro Bundler process exited with code ${code}`));
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
  const statusUrl = `${packagerUrl}/status`;
  const timeoutPromise = new Promise((resolve, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Could not access packager status at ${statusUrl}. Are you sure the packager is running and reachable?`
          )
        ),
      WAIT_FOR_PACKAGER_TIMEOUT
    )
  );
  await Promise.race([_waitForRunningAsync(statusUrl), exitPromise, timeoutPromise]);
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
  'EXPO_ANDROID_KEY_PASSWORD',
  'EXPO_ANDROID_KEYSTORE_PASSWORD',
  'EXPO_IOS_DIST_P12_PASSWORD',
  'EXPO_IOS_PUSH_P12_PASSWORD',
]);

function shouldExposeEnvironmentVariableInManifest(key) {
  if (blacklistedEnvironmentVariables.has(key.toUpperCase())) {
    return false;
  }
  return key.startsWith('REACT_NATIVE_') || key.startsWith('EXPO_');
}

export async function startExpoServerAsync(projectRoot: string) {
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
    throw new Error(`Couldn't start project. Please fix the errors and restart the project.`);
  } // Serve the manifest.
  let manifestHandler = async (req, res) => {
    try {
      // We intentionally don't `await`. We want to continue trying even
      // if there is a potential error in the package.json and don't want to slow
      // down the request
      Doctor.validateWithNetworkAsync(projectRoot);
      let { exp: manifest } = await ProjectUtils.readConfigJsonAsync(projectRoot);
      if (!manifest) {
        const configName = await ProjectUtils.configFilenameAsync(projectRoot);
        throw new Error(`No ${configName} file found`);
      } // Get packager opts and then copy into bundleUrlPackagerOpts
      let packagerOpts = await ProjectSettings.getPackagerOptsAsync(projectRoot);
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
      let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
      let platform = req.headers['exponent-platform'] || 'ios';
      entryPoint = UrlUtils.getPlatformSpecificBundleUrl(entryPoint, platform);
      let mainModuleName = UrlUtils.guessMainModulePath(entryPoint);
      let queryParams = await UrlUtils.constructBundleQueryParamsAsync(
        projectRoot,
        packagerOpts,
        req.hostname
      );
      let path = `/${encodeURI(mainModuleName)}.bundle?platform=${encodeURIComponent(
        platform
      )}&${queryParams}`;
      manifest.bundleUrl =
        (await UrlUtils.constructBundleUrlAsync(projectRoot, bundleUrlPackagerOpts, req.hostname)) +
        path;
      manifest.debuggerHost = await UrlUtils.constructDebuggerHostAsync(projectRoot, req.hostname);
      manifest.mainModuleName = mainModuleName;
      manifest.logUrl = await UrlUtils.constructLogUrlAsync(projectRoot, req.hostname);
      manifest.hostUri = await UrlUtils.constructHostUriAsync(projectRoot, req.hostname);
      await _resolveManifestAssets(
        projectRoot,
        manifest,
        async path => manifest.bundleUrl.match(/^https?:\/\/.*?\//)[0] + 'assets/' + path
      ); // the server normally inserts this but if we're offline we'll do it here
      await _resolveGoogleServicesFile(projectRoot, manifest);
      const hostUUID = await UserSettings.anonymousIdentifier();
      let currentSession = await UserManager.getSessionAsync();
      if (!currentSession) {
        manifest.id = `@anonymous/${manifest.slug}-${hostUUID}`;
      }
      let manifestString = JSON.stringify(manifest);
      if (req.headers['exponent-accept-signature']) {
        if (_cachedSignedManifest.manifestString === manifestString) {
          manifestString = _cachedSignedManifest.signedManifest;
        } else {
          if (!currentSession) {
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
        developerTool: Config.developerTool,
      });
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error in manifestHandler: ${e} ${e.stack}`); // 5xx = Server Error HTTP code
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
      ProjectUtils.logError(projectRoot, 'expo', `Error getting device logs: ${e} ${e.stack}`);
    }
    res.send('Success');
  });
  app.post('/shutdown', async (req, res) => {
    server.close();
    res.send('Success');
  });
  let expRc = await ProjectUtils.readExpRcAsync(projectRoot);
  let expoServerPort = expRc.manifestPort ? expRc.manifestPort : await _getFreePortAsync(19000);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort,
  });
  let server = app.listen(expoServerPort, () => {
    let host = server.address().address;
    let port = server.address().port;
    ProjectUtils.logDebug(projectRoot, 'expo', `Local server listening at http://${host}:${port}`);
  });
  await Exp.saveRecentExpRootAsync(projectRoot);
}
export async function stopExpoServerAsync(projectRoot: string) {
  _assertValidProjectRoot(projectRoot);
  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (packagerInfo && packagerInfo.expoServerPort) {
    try {
      await request.post(`http://localhost:${packagerInfo.expoServerPort}/shutdown`);
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
    let configPath = path.join(UserSettings.dotExpoHomeDirectory(), 'ngrok.yml');
    let hostname = await hostnameAsync();
    let url = await ngrokConnectAsync({
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

export async function startTunnelsAsync(projectRoot: string) {
  let username = await UserManager.getCurrentUsernameAsync();
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
      'Successfully ran `adb reverse`. Localhost URLs should work on the connected Android device.'
    );
  }
  let packageShortName = path.parse(projectRoot).base;
  let expRc = await ProjectUtils.readExpRcAsync(projectRoot);

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

      ngrok.addListener('statuschange', status => {
        if (status === 'reconnecting') {
          ProjectUtils.logError(
            projectRoot,
            'expo',
            'We noticed your tunnel is having issues. This may be due to intermittent problems with our tunnel provider. If you have trouble connecting to your app, try to Restart the project, or switch Host to LAN.'
          );
        } else if (status === 'online') {
          ProjectUtils.logInfo(projectRoot, 'expo', 'Tunnel connected.');
        }
      });
    })(),
  ]);
}
export async function stopTunnelsAsync(projectRoot: string) {
  _assertValidProjectRoot(projectRoot); // This will kill all ngrok tunnels in the process. // We'll need to change this if we ever support more than one project // open at a time in XDE.
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
    packagerPort?: number,
  }
) {
  _assertValidProjectRoot(projectRoot); // Check to make sure all options are valid
  let schema = joi.object().keys({
    packagerPort: joi.number().integer(),
  });
  try {
    await joiValidateAsync(options, schema);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, options);
}
export async function getUrlAsync(projectRoot: string, options: Object = {}) {
  _assertValidProjectRoot(projectRoot);
  return await UrlUtils.constructManifestUrlAsync(projectRoot, options);
}

export async function startAsync(
  projectRoot: string,
  options: Object = {},
  verbose: boolean = true
): Promise<any> {
  _assertValidProjectRoot(projectRoot);
  Analytics.logEvent('Start Project', {
    projectRoot,
    developerTool: Config.developerTool,
  });
  await startExpoServerAsync(projectRoot);
  await startReactNativeServerAsync(projectRoot, options, verbose);
  if (!Config.offline) {
    try {
      await startTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error starting tunnel ${e.message}`);
    }
  }
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  DevSession.startSession(projectRoot, exp);
  return exp;
}
async function _stopInternalAsync(projectRoot: string): Promise<void> {
  DevSession.stopSession();
  await stopExpoServerAsync(projectRoot);
  await stopReactNativeServerAsync(projectRoot);
  if (!Config.offline) {
    try {
      await stopTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error stopping ngrok ${e.message}`);
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
    });
  }
}
