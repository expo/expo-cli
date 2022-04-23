import { getConfig, isLegacyImportsEnabled, Platform } from '@expo/config';
import { bundleAsync, BundleOutput } from '@expo/dev-server';
import axios from 'axios';
import chalk from 'chalk';

import {
  ErrorCode,
  learnMore,
  Logger as logger,
  ProjectUtils,
  PublishOptions,
  resolveEntryPoint,
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
  TableText,
  UrlUtils,
  XDLError,
} from '../internal';

const MINIMUM_BUNDLE_SIZE = 500;

type PackagerOptions = {
  dev: boolean;
  minify: boolean;
};

export function printBundleSizes(bundles: { android?: BundleOutput; ios?: BundleOutput }) {
  const files: [string, string | Uint8Array][] = [];

  if (bundles.ios?.hermesBytecodeBundle) {
    files.push(['index.ios.js (Hermes)', bundles.ios.hermesBytecodeBundle]);
  } else if (bundles.ios?.code) {
    files.push(['index.ios.js', bundles.ios.code]);
  }
  if (bundles.android?.hermesBytecodeBundle) {
    files.push(['index.android.js (Hermes)', bundles.android.hermesBytecodeBundle]);
  } else if (bundles.android?.code) {
    files.push(['index.android.js', bundles.android.code]);
  }

  // Account for inline source maps
  if (bundles.ios?.hermesSourcemap) {
    files.push([chalk.dim('index.ios.js.map (Hermes)'), bundles.ios.hermesSourcemap]);
  } else if (bundles.ios?.map) {
    files.push([chalk.dim('index.ios.js.map'), bundles.ios.map]);
  }
  if (bundles.android?.hermesSourcemap) {
    files.push([chalk.dim('index.android.js.map (Hermes)'), bundles.android.hermesSourcemap]);
  } else if (bundles.android?.map) {
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
}

export async function createBundlesAsync(
  projectRoot: string,
  publishOptions: PublishOptions = {},
  bundleOptions: { platforms: Platform[]; dev?: boolean; useDevServer: boolean }
): Promise<Partial<Record<Platform, BundleOutput>>> {
  if (!bundleOptions.useDevServer) {
    // The old approach is so unstable / untested that we should warn users going forward to upgrade their projects.
    logger.global.warn(
      'Using legacy Metro server to bundle your JavaScript code, you may encounter unexpected behavior if your project uses a custom metro.config.js file.'
    );
    // Dev server is aggressively enabled, so we can have a specific warning message:
    // - If the SDK version is UNVERSIONED or undefined, it'll be enabled.
    // - If EXPO_USE_DEV_SERVER is 0, or unset, it'll be enabled.
    logger.global.warn(
      `Please upgrade your project to Expo SDK 40+. If you experience CLI issues after upgrading, try using the env var EXPO_USE_DEV_SERVER=1.`
    );

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

  const config = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const isLegacy = isLegacyImportsEnabled(config.exp);
  const bundles = await bundleAsync(
    projectRoot,
    config.exp,
    {
      // If not legacy, ignore the target option to prevent warnings from being thrown.
      target: !isLegacy ? undefined : publishOptions.target,
      resetCache: publishOptions.resetCache,
      maxWorkers: publishOptions.maxWorkers,
      logger: ProjectUtils.getLogger(projectRoot),
      quiet: publishOptions.quiet,
      unversioned: !config.exp.sdkVersion || config.exp.sdkVersion === 'UNVERSIONED',
    },
    bundleOptions.platforms.map((platform: Platform) => ({
      platform,
      entryPoint: resolveEntryPoint(projectRoot, platform),
      dev: bundleOptions.dev,
    }))
  );

  // { ios: bundle, android: bundle }
  const results: Record<string, BundleOutput> = {};

  for (let index = 0; index < bundleOptions.platforms.length; index++) {
    const platform = bundleOptions.platforms[index];
    const bundle = bundles[index];
    results[platform] = bundle;
  }

  return results;
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
  } catch (error: any) {
    if (error.response) {
      if (error.response.data) {
        let body;
        try {
          body = JSON.parse(error.response.data);
        } catch {
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
