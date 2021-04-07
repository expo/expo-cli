import { Analytics, ApiV2, Config, User, UserManager } from '@expo/api';
import {
  ExpoAppManifest,
  ExpoConfig,
  getDefaultTarget,
  HookArguments,
  PackageJSONConfig,
} from '@expo/config';
import FormData from 'form-data';
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
  Sentry,
  XDLError,
} from '../internal';

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

  if (Env.isDebug()) {
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
  const bundles = await createBundlesAsync(projectRoot, options, {
    useDevServer: Env.shouldUseDevServer(exp),
  });

  printBundleSizes(bundles);

  await ProjectAssets.publishAssetsAsync({ projectRoot, exp, bundles });

  const androidBundle = bundles.android.code;
  const iosBundle = bundles.ios.code;

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

    const hookOptions: Omit<HookArguments, 'config'> = {
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
