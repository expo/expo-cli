import {
  ExpoAppManifest,
  ExpoConfig,
  getConfig,
  getDefaultTarget,
  isLegacyImportsEnabled,
  PackageJSONConfig,
  Platform,
} from '@expo/config';
import { bundleAsync } from '@expo/dev-server';
import axios from 'axios';
import chalk from 'chalk';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';

import Analytics from '../Analytics';
import ApiV2 from '../ApiV2';
import Config from '../Config';
import * as EmbeddedAssets from '../EmbeddedAssets';
import { isDebug, shouldUseDevServer } from '../Env';
import { ErrorCode } from '../ErrorCode';
import logger from '../Logger';
import { publishAssetsAsync } from '../ProjectAssets';
import * as Sentry from '../Sentry';
import * as UrlUtils from '../UrlUtils';
import UserManager, { User } from '../User';
import XDLError from '../XDLError';
import * as ExponentTools from '../detach/ExponentTools';
import * as TableText from '../logs/TableText';
import { learnMore } from '../logs/TerminalLink';
import {
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
} from '../start/startLegacyReactNativeServerAsync';
import { resolveEntryPoint } from '../tools/resolveEntryPoint';
import * as Doctor from './Doctor';
import * as ProjectUtils from './ProjectUtils';
import { getPublishExpConfigAsync, PublishOptions } from './getPublishExpConfigAsync';
import { LoadedHook, prepareHooks, runHook } from './runHook';

const MINIMUM_BUNDLE_SIZE = 500;

type PackagerOptions = {
  dev: boolean;
  minify: boolean;
};

export async function buildPublishBundlesAsync(
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

  const isLegacy = isLegacyImportsEnabled(
    getConfig(projectRoot, { skipSDKVersionRequirement: true }).exp
  );
  // If not legacy, delete the target option to prevent warnings from being thrown.
  if (!isLegacy) {
    delete publishOptions.target;
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

export interface PublishedProjectResult {
  /**
   * Project manifest URL
   */
  url: string;
  /**
   * Project page URL
   */
  projectPageUrl: string;
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

  if (isDebug()) {
    console.log();
    console.log('Publish Assets:');
    console.log(`- Asset target: ${target}`);
    console.log();
  }

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
  const { exp, pkg, hooks } = await getPublishExpConfigAsync(projectRoot, options);

  // Exit early if kernel builds are created with robot users
  if (exp.isKernel && user.kind === 'robot') {
    throw new XDLError('ROBOT_ACCOUNT_ERROR', 'Kernel builds are not available for robot users');
  }

  // TODO: refactor this out to a function, throw error if length doesn't match
  const validPostPublishHooks: LoadedHook[] = prepareHooks(hooks, 'postPublish', projectRoot);
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

  const shouldPublishAndroidMaps = !!exp.android?.publishSourceMapPath;
  const shouldPublishIosMaps = !!exp.ios?.publishSourceMapPath;
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
    exp.ios?.publishManifestPath ||
    exp.android?.publishManifestPath ||
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

  // Create project manifest URL
  const url =
    options.releaseChannel && options.releaseChannel !== 'default'
      ? `${response.url}?release-channel=${options.releaseChannel}`
      : response.url;

  // Create project page URL
  const projectPageUrl = response.projectPageUrl
    ? options.releaseChannel && options.releaseChannel !== 'default'
      ? `${response.projectPageUrl}?release-channel=${options.releaseChannel}`
      : response.projectPageUrl
    : null;

  return {
    ...response,
    url,
    projectPageUrl,
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
