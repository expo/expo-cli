import { Analytics, Auth, ProcessSettings, Publish, UserManager } from '@expo/api';
import { ExpoAppManifest, getDefaultTarget, HookArguments } from '@expo/config';
import fs from 'fs-extra';
import path from 'path';

import {
  createBundlesAsync,
  Doctor,
  EmbeddedAssets,
  Env,
  ExponentTools,
  getPublishExpConfigAsync,
  LoadedHook,
  Logger as logger,
  prepareHooks,
  printBundleSizes,
  ProjectAssets,
  PublishOptions,
  runHook,
  XDLError,
} from '../internal';

export interface PublishedProjectResult {
  /**
   * Project manifest URL
   */
  url: string;
  /**
   * Project page URL
   */
  projectPageUrl: string | null;
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

  if (Env.isDebug()) {
    console.log();
    console.log('Publish Assets:');
    console.log(`- Asset target: ${target}`);
    console.log();
  }

  Analytics.logEvent('Publish', {
    developerTool: ProcessSettings.developerTool,
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

  // TODO: refactor this out to a function, throw error if length doesn't match
  const validPostPublishHooks: LoadedHook[] = prepareHooks(hooks, 'postPublish', projectRoot);
  const bundles = await createBundlesAsync(projectRoot, options, {
    platforms: ['ios', 'android'],
    useDevServer: Env.shouldUseDevServer(exp.sdkVersion),
  });

  printBundleSizes(bundles);

  await ProjectAssets.publishAssetsAsync({ projectRoot, exp, bundles });

  const androidBundle = bundles.android?.hermesBytecodeBundle ?? bundles.android?.code!;
  const iosBundle = bundles.ios?.hermesBytecodeBundle ?? bundles.ios?.code!;

  const hasHooks = validPostPublishHooks.length > 0;

  const androidSourceMap = hasHooks
    ? bundles.android?.hermesSourcemap ?? bundles.android?.map ?? null
    : null;
  const iosSourceMap = hasHooks ? bundles.ios?.hermesSourcemap ?? bundles.ios?.map ?? null : null;

  let response;
  try {
    logger.global.info('');
    logger.global.info('Uploading JavaScript bundles');
    const user = await UserManager.ensureLoggedInAsync();
    response = await Publish.uploadArtifactsAsync(user, {
      pkg,
      exp,
      iosBundle,
      androidBundle,
      options,
    });
  } catch (e: any) {
    if (e.serverError === 'SCHEMA_VALIDATION_ERROR') {
      throw new Error(
        `There was an error validating your project schema. Check for any warnings about the contents of your app.json or app.config.js.`
      );
    }
    throw e;
  }

  let androidManifest = {};
  let iosManifest = {};
  const fullManifestUrl = response.url.replace('exp://', 'https://');

  if (
    validPostPublishHooks.length ||
    exp.ios?.publishManifestPath ||
    exp.android?.publishManifestPath ||
    EmbeddedAssets.shouldEmbedAssetsForExpoUpdates(projectRoot, exp, pkg, target)
  ) {
    const sdkOrRuntimeVersion = exp.runtimeVersion
      ? {
          'expo-runtime-version': exp.runtimeVersion,
        }
      : { 'expo-sdk-version': exp.sdkVersion };

    [androidManifest, iosManifest] = await Promise.all([
      ExponentTools.getManifestAsync(response.url, {
        ...sdkOrRuntimeVersion,
        'Exponent-Platform': 'android',
        'Expo-Release-Channel': options.releaseChannel,
        Accept: 'application/expo+json,application/json',
      }),
      ExponentTools.getManifestAsync(response.url, {
        ...sdkOrRuntimeVersion,
        'Exponent-Platform': 'ios',
        'Expo-Release-Channel': options.releaseChannel,
        Accept: 'application/expo+json,application/json',
      }),
    ]);

    const hookOptions: Omit<HookArguments, 'config'> = {
      url: response.url,
      exp,
      iosBundle,
      iosSourceMap,
      iosManifest,
      iosManifestUrl: fullManifestUrl,
      androidBundle,
      androidSourceMap,
      androidManifest,
      androidManifestUrl: fullManifestUrl,
      projectRoot,
      log: (msg: any) => {
        logger.global.info({ quiet: true }, msg);
      },
    };

    for (const hook of validPostPublishHooks) {
      logger.global.info(`Running postPublish hook: ${hook.file}`);
      try {
        runHook(hook, hookOptions);
      } catch (e: any) {
        logger.global.warn(`Warning: postPublish hook '${hook.file}' failed: ${e.stack}`);
      }
    }
  }

  await EmbeddedAssets.configureAsync({
    projectRoot,
    pkg,
    exp,
    releaseChannel: options.releaseChannel ?? 'default',
    iosManifestUrl: fullManifestUrl,
    iosManifest,
    iosBundle,
    androidManifestUrl: fullManifestUrl,
    androidManifest,
    androidBundle,
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

async function _handleKernelPublishedAsync({
  projectRoot,
  user,
  exp,
  url,
}: {
  projectRoot: string;
  user: Auth.User | Auth.RobotUser;
  exp: ExpoAppManifest;
  url: string;
}) {
  let owner = exp.owner;
  if (!owner) {
    if (user.kind !== 'user') {
      throw new XDLError(
        'ROBOT_ACCOUNT_ERROR',
        'Kernel builds are not available for robot users when owner app.json field is not supplied'
      );
    }
    owner = user.username;
  }

  let kernelBundleUrl = `${ProcessSettings.api.scheme}://${ProcessSettings.api.host}`;
  if (ProcessSettings.api.port) {
    kernelBundleUrl = `${kernelBundleUrl}:${ProcessSettings.api.port}`;
  }
  kernelBundleUrl = `${kernelBundleUrl}/@${owner}/${exp.slug}/bundle`;
  const sdkOrRuntimeVersion = exp.runtimeVersion
    ? {
        'expo-runtime-version': exp.runtimeVersion,
      }
    : { 'expo-sdk-version': exp.sdkVersion };

  if (exp.kernel?.androidManifestPath) {
    const manifest = await ExponentTools.getManifestAsync(url, {
      ...sdkOrRuntimeVersion,
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
      ...sdkOrRuntimeVersion,
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
