import { ExpoAppManifest, getConfig, PackageJSONConfig, ProjectTarget } from '@expo/config';
import { AndroidConfig, IOSConfig } from '@expo/config-plugins';
import plist from '@expo/plist';
import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';

import {
  ExponentTools,
  IosPlist,
  IosWorkspace,
  Logger as logger,
  StandaloneContext,
  writeArtifactSafelyAsync,
} from './internal';

const PLACEHOLDER_URL = 'YOUR-APP-URL-HERE';

export type EmbeddedAssetsConfiguration = {
  projectRoot: string;
  pkg: PackageJSONConfig;
  exp: ExpoAppManifest;
  releaseChannel?: string;
  iosManifestUrl: string;
  iosManifest: any;
  iosBundle: string | Uint8Array;
  androidManifestUrl: string;
  androidManifest: any;
  androidBundle: string | Uint8Array;
  target: ProjectTarget;
};

export async function configureAsync(config: EmbeddedAssetsConfiguration) {
  await _maybeWriteArtifactsToDiskAsync(config);
  await _maybeConfigureExpoKitEmbeddedAssetsAsync(config);
  await _maybeRunModifiedExpoUpdatesPluginAsync(config);
}

export function getEmbeddedManifestPath(
  platform: 'ios' | 'android',
  projectRoot: string,
  exp: ExpoAppManifest
): string {
  if (platform === 'ios') {
    return exp.ios && exp.ios.publishManifestPath
      ? exp.ios.publishManifestPath
      : _getDefaultEmbeddedManifestPath(platform, projectRoot, exp);
  } else if (platform === 'android') {
    return exp.android && exp.android.publishManifestPath
      ? exp.android.publishManifestPath
      : _getDefaultEmbeddedManifestPath(platform, projectRoot, exp);
  }
  return _getDefaultEmbeddedManifestPath(platform, projectRoot, exp);
}

function _getDefaultEmbeddedManifestPath(
  platform: 'ios' | 'android',
  projectRoot: string,
  exp: ExpoAppManifest
): string {
  return path.join(_getDefaultEmbeddedAssetDir(platform, projectRoot, exp), 'app.manifest');
}

function _getDefaultEmbeddedBundlePath(
  platform: 'ios' | 'android',
  projectRoot: string,
  exp: ExpoAppManifest
): string {
  return path.join(_getDefaultEmbeddedAssetDir(platform, projectRoot, exp), 'app.bundle');
}

function _getDefaultEmbeddedAssetDir(
  platform: 'ios' | 'android',
  projectRoot: string,
  exp: ExpoAppManifest
): string {
  if (platform === 'ios') {
    const { iosSupportingDirectory } = getIOSPaths(projectRoot);
    return iosSupportingDirectory;
  } else if (platform === 'android') {
    return path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
  } else {
    throw new Error('Embedding assets is not supported for platform ' + platform);
  }
}

export function shouldEmbedAssetsForExpoUpdates(
  projectRoot: string,
  exp: ExpoAppManifest,
  pkg: PackageJSONConfig,
  target: ProjectTarget
): boolean {
  if (!pkg.dependencies?.['expo-updates'] || target !== 'bare') {
    return false;
  }

  // semver.coerce can return null
  const expoUpdatesVersion = semver.coerce(pkg.dependencies['expo-updates']);

  // expo-updates 0.1.x relies on expo-cli automatically embedding the manifest and bundle
  if (expoUpdatesVersion && semver.satisfies(expoUpdatesVersion, '~0.1.0')) {
    return true;
  }

  // We also want to support developers who had expo-updates 0.1.x and upgraded but still rely on
  // expo-cli's automatic embedding. If the files already exist we can assume we need to update them
  if (
    fs.existsSync(_getDefaultEmbeddedBundlePath('android', projectRoot, exp)) ||
    fs.existsSync(_getDefaultEmbeddedManifestPath('android', projectRoot, exp)) ||
    fs.existsSync(_getDefaultEmbeddedBundlePath('ios', projectRoot, exp)) ||
    fs.existsSync(_getDefaultEmbeddedManifestPath('ios', projectRoot, exp))
  ) {
    return true;
  }

  return false;
}

async function _maybeWriteArtifactsToDiskAsync(config: EmbeddedAssetsConfiguration) {
  const {
    projectRoot,
    pkg,
    exp,
    iosManifest,
    iosBundle,
    androidManifest,
    androidBundle,
    target,
  } = config;

  let androidBundlePath;
  let androidManifestPath;
  let iosBundlePath;
  let iosManifestPath;

  if (shouldEmbedAssetsForExpoUpdates(projectRoot, exp, pkg, target)) {
    const defaultAndroidDir = _getDefaultEmbeddedAssetDir('android', projectRoot, exp);
    const defaultIosDir = _getDefaultEmbeddedAssetDir('ios', projectRoot, exp);

    await fs.ensureDir(defaultIosDir);
    await fs.ensureDir(defaultAndroidDir);

    androidBundlePath = _getDefaultEmbeddedBundlePath('android', projectRoot, exp);
    androidManifestPath = _getDefaultEmbeddedManifestPath('android', projectRoot, exp);
    iosBundlePath = _getDefaultEmbeddedBundlePath('ios', projectRoot, exp);
    iosManifestPath = _getDefaultEmbeddedManifestPath('ios', projectRoot, exp);

    if (!fs.existsSync(iosBundlePath) || !fs.existsSync(iosManifestPath)) {
      logger.global.warn(
        'Creating app.manifest and app.bundle inside of your ios/<project>/Supporting directory.\nBe sure to add these files to your Xcode project. More info at https://expo.fyi/embedded-assets'
      );
    }
  }

  // allow custom overrides
  if (exp.android?.publishBundlePath) {
    androidBundlePath = exp.android.publishBundlePath;
  }
  if (exp.android?.publishManifestPath) {
    androidManifestPath = exp.android.publishManifestPath;
  }
  if (exp.ios?.publishBundlePath) {
    iosBundlePath = exp.ios.publishBundlePath;
  }
  if (exp.ios?.publishManifestPath) {
    iosManifestPath = exp.ios.publishManifestPath;
  }

  if (androidBundlePath) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'android.publishBundlePath',
      androidBundlePath,
      androidBundle
    );
  }

  if (androidManifestPath) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'android.publishManifestPath',
      androidManifestPath,
      JSON.stringify(androidManifest)
    );
  }

  if (iosBundlePath) {
    await writeArtifactSafelyAsync(projectRoot, 'ios.publishBundlePath', iosBundlePath, iosBundle);
  }

  if (iosManifestPath) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'ios.publishManifestPath',
      iosManifestPath,
      JSON.stringify(iosManifest)
    );
  }
}

async function _maybeConfigureExpoKitEmbeddedAssetsAsync(config: EmbeddedAssetsConfiguration) {
  const { projectRoot, exp, releaseChannel, androidManifestUrl, androidManifest } = config;

  const context = StandaloneContext.createUserContext(projectRoot, exp);
  const { supportingDirectory } = IosWorkspace.getPaths(context);

  // iOS ExpoKit
  if (releaseChannel && fs.existsSync(path.join(supportingDirectory, 'EXShell.plist'))) {
    // This is an ExpoKit app, set properties in EXShell.plist
    await IosPlist.modifyAsync(supportingDirectory, 'EXShell', (shellPlist: any) => {
      shellPlist.releaseChannel = releaseChannel;
      return shellPlist;
    });
  }

  // Android ExpoKit
  const constantsPath = path.join(
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
  if (fs.existsSync(constantsPath)) {
    // This is an ExpoKit app
    // We need to add EmbeddedResponse instances on Android to tell the runtime
    // that the shell app manifest and bundle is packaged.
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
      embeddedResponses.add(new Constants.EmbeddedResponse("${androidManifestUrl}", "assets://shell-app-manifest.json", "application/json"));
      embeddedResponses.add(new Constants.EmbeddedResponse("${androidManifest.bundleUrl}", "assets://shell-app.bundle", "application/javascript"));
      // END EMBEDDED RESPONSES`,
      constantsPath
    );
    if (releaseChannel) {
      await ExponentTools.regexFileAsync(
        /RELEASE_CHANNEL = "[^"]*"/,
        `RELEASE_CHANNEL = "${releaseChannel}"`,
        constantsPath
      );
    }
  }
}

/**
 * Guess if this is a users first publish and run a slightly modified expo-updates plugin
 */
async function _maybeRunModifiedExpoUpdatesPluginAsync(config: EmbeddedAssetsConfiguration) {
  if (!config.pkg.dependencies?.['expo-updates'] || config.target === 'managed') {
    return;
  }

  const { projectRoot, exp, releaseChannel, iosManifestUrl, androidManifestUrl } = config;

  const { iosSupportingDirectory: supportingDirectory } = getIOSPaths(projectRoot);

  let isAMismatchBetweenInferredAndConfiguredValues = false;

  // iOS expo-updates
  let isLikelyFirstIOSPublish = false;
  const expoPlistPath = path.join(supportingDirectory, 'Expo.plist');
  if (fs.existsSync(expoPlistPath)) {
    let expoPlistForProject = plist.parse(await fs.readFileSync(expoPlistPath, 'utf8'));
    const currentlyConfiguredExpoPlist = { ...expoPlistForProject };

    // The username is only used for defining a default updates URL.
    // Since we overwrite the URL below the username is superfluous.
    expoPlistForProject = IOSConfig.Updates.setUpdatesConfig(
      exp,
      expoPlistForProject,
      /*expoUsername*/ null
    );

    // overwrite the URL defined in IOSConfig.Updates.setUpdatesConfig
    expoPlistForProject[IOSConfig.Updates.Config.UPDATE_URL] = iosManifestUrl;
    // set a release channel (not done in updates plugin)
    if (releaseChannel) {
      expoPlistForProject[IOSConfig.Updates.Config.RELEASE_CHANNEL] = releaseChannel;
    }

    // If we guess that this is a users first publish, modify the native code to match
    // what is configured.
    const configuredIOSUpdatesURL =
      currentlyConfiguredExpoPlist[IOSConfig.Updates.Config.UPDATE_URL];
    if (configuredIOSUpdatesURL === PLACEHOLDER_URL) {
      isLikelyFirstIOSPublish = true;
      fs.writeFileSync(expoPlistPath, plist.build(expoPlistForProject));
    } else {
      // Log warnings if this is not the first publish and critical properties seem misconfigured
      const {
        UPDATE_URL,
        SDK_VERSION,
        RUNTIME_VERSION,
        RELEASE_CHANNEL,
      } = IOSConfig.Updates.Config;
      for (const key of [UPDATE_URL, SDK_VERSION, RUNTIME_VERSION, RELEASE_CHANNEL]) {
        if (currentlyConfiguredExpoPlist[key] !== expoPlistForProject[key]) {
          isAMismatchBetweenInferredAndConfiguredValues = true;
          switch (key) {
            case UPDATE_URL: {
              logger.global.warn(
                `\nThe inferred value of the update URL is (${expoPlistForProject[key]}), but (${key}) in the Expo.plist is set to (${currentlyConfiguredExpoPlist[key]}).` +
                  `\nThis could be due to:` +
                  `\n . 1. The value of 'updates.url' set in the app.json` +
                  `\n . 2. The values of 'owner' and 'slug' set in the app.json` +
                  `\n . 3. The value of the --public-url flag`
              );
              break;
            }
            case SDK_VERSION: {
              logger.global.warn(
                `\nIn your app.json (sdkVersion) is set to (${expoPlistForProject[key]}), but (${key}) in the Expo.plist is set to (${currentlyConfiguredExpoPlist[key]}).`
              );
              break;
            }
            case RUNTIME_VERSION: {
              logger.global.warn(
                `\nIn your app.json (runtimeVersion) is set to (${expoPlistForProject[key]}), but (${key}) in the Expo.plist is set to (${currentlyConfiguredExpoPlist[key]}).`
              );
              break;
            }
            case RELEASE_CHANNEL: {
              logger.global.warn(
                `\nThe value passed to --release-channel flag is to (${expoPlistForProject[key]}), but (${key}) in the Expo.plist is set to (${currentlyConfiguredExpoPlist[key]}).`
              );
              break;
            }
            default:
              logger.global.warn(
                `${key} is inferred to be ${expoPlistForProject[key]}, but (${key}) in the Expo.plist is set to (${currentlyConfiguredExpoPlist[key]}).`
              );
          }
        }
      }
    }
  }

  // Android expo-updates
  let isLikelyFirstAndroidPublish = false;
  const androidManifestXmlPath = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  const AndroidManifestKeyForUpdateURL = AndroidConfig.Updates.Config.UPDATE_URL;
  if (fs.existsSync(androidManifestXmlPath)) {
    const currentlyConfiguredAndroidManifest = await AndroidConfig.Manifest.readAndroidManifestAsync(
      androidManifestXmlPath
    );
    const [currentConfiguredManifestApplication] =
      currentlyConfiguredAndroidManifest.manifest.application ?? [];
    const currentlyConfiguredMetaDataAttributes =
      currentConfiguredManifestApplication['meta-data']?.map(md => md['$']) ?? [];

    // The username is only used for defining a default updates URL.
    // Since we overwrite the URL below the username is superfluous.
    const inferredAndroidManifest = AndroidConfig.Updates.setUpdatesConfig(
      exp,
      currentlyConfiguredAndroidManifest,
      /*username*/ null
    );
    const inferredMainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      inferredAndroidManifest
    );
    // overwrite the URL defined in AndroidConfig.Updates.setUpdatesConfig
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      inferredMainApplication,
      AndroidManifestKeyForUpdateURL,
      androidManifestUrl
    );
    // set a release channel (not done in updates plugin)
    if (releaseChannel) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        inferredMainApplication,
        AndroidConfig.Updates.Config.RELEASE_CHANNEL,
        releaseChannel
      );
    }

    // If we guess that this is a users first publish, modify the native code to match
    // what is configured.
    const currentlyConfiguredAndroidUpdateURL = currentlyConfiguredMetaDataAttributes.find(
      x => x['android:name'] === AndroidConfig.Updates.Config.UPDATE_URL
    )?.['android:value'];
    if (currentlyConfiguredAndroidUpdateURL === PLACEHOLDER_URL) {
      isLikelyFirstAndroidPublish = true;
      await AndroidConfig.Manifest.writeAndroidManifestAsync(
        androidManifestXmlPath,
        inferredAndroidManifest
      );
    } else {
      // Log warnings if this is not the first publish and critical properties seem misconfigured
      const [inferredManifestApplication] = inferredAndroidManifest.manifest.application!;
      const inferredMetaDataAttributes = inferredManifestApplication['meta-data']?.map(
        md => md['$']
      )!;

      const {
        UPDATE_URL,
        SDK_VERSION,
        RUNTIME_VERSION,
        RELEASE_CHANNEL,
      } = AndroidConfig.Updates.Config;
      for (const key of [UPDATE_URL, SDK_VERSION, RUNTIME_VERSION, RELEASE_CHANNEL]) {
        const inferredValue = inferredMetaDataAttributes.find(x => x['android:name'] === key)?.[
          'android:value'
        ];
        const currentlyConfiguredValue = currentlyConfiguredMetaDataAttributes.find(
          x => x['android:name'] === key
        )?.['android:value'];
        if (inferredValue !== currentlyConfiguredValue) {
          isAMismatchBetweenInferredAndConfiguredValues = true;
          switch (key) {
            case UPDATE_URL: {
              logger.global.warn(
                `\nThe inferred value of the update URL is (${inferredValue}), but (${key}) in the AndroidManifest.xml is set to (${currentlyConfiguredValue}).` +
                  `\nThis could be due to:` +
                  `\n . 1. The value of 'updates.url' set in the app.json` +
                  `\n . 2. The values of 'owner' and 'slug' set in the app.json` +
                  `\n . 3. The value of the --public-url flag`
              );
              break;
            }
            case SDK_VERSION: {
              logger.global.warn(
                `\nIn your app.json (sdkVersion) is set to (${inferredValue}), but (${key}) in the AndroidManifest.xml is set to (${currentlyConfiguredValue}).`
              );
              break;
            }
            case RUNTIME_VERSION: {
              logger.global.warn(
                `\nIn your app.json (runtimeVersion) is set to (${inferredValue}), but (${key}) in the AndroidManifest.xml is set to (${currentlyConfiguredValue}).`
              );
              break;
            }
            case RELEASE_CHANNEL: {
              logger.global.warn(
                `\nThe value passed to --release-channel flag is to (${inferredValue}), but (${key}) in the AndroidManifest.xml is set to (${currentlyConfiguredValue}).`
              );
              break;
            }
            default:
              logger.global.warn(
                `${key} is inferred to be ${inferredValue}, but (${key}) in the AndroidManifest.xml is set to (${currentlyConfiguredValue}).`
              );
          }
        }
      }
    }
  }
  if (
    isAMismatchBetweenInferredAndConfiguredValues &&
    !(isLikelyFirstIOSPublish || isLikelyFirstAndroidPublish)
  ) {
    logger.global.warn(
      `\nMake sure the values set in app.json, or passed via the command line, match the builds you're intending to update.`
    );
  }

  if (isLikelyFirstIOSPublish || isLikelyFirstAndroidPublish) {
    let platformSpecificMessage: string;

    if (isLikelyFirstIOSPublish && !isLikelyFirstAndroidPublish) {
      platformSpecificMessage =
        '🚀 It looks like this your first iOS publish for this project! ' +
        'Automatically setup Expo updates in the Expo.plist. ';
    } else if (!isLikelyFirstIOSPublish && isLikelyFirstAndroidPublish) {
      platformSpecificMessage =
        '🚀 It looks like this your first Android publish for this project! ' +
        'Automatically setup Expo updates in the AndroidManifest.xml. ';
    } else {
      platformSpecificMessage =
        '🚀 It looks like this your first publish for this project! ' +
        'Automatically setup Expo updates in the Expo.plist and the AndroidManifest.xml. ';
    }

    logger.global.warn(
      platformSpecificMessage +
        `You'll need to make and release a new build before your users can download the update ` +
        'you just published.'
    );
  }
}

/** The code below here is duplicated from expo-cli currently **/

// TODO: it's silly and kind of fragile that we look at app config to determine
// the ios project paths. Overall this function needs to be revamped, just a
// placeholder for now! Make this more robust when we support applying config
// at any time (currently it's only applied on eject).
export function getIOSPaths(projectRoot: string) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const projectName = exp.name;
  if (!projectName) {
    throw new Error('Your project needs a name in app.json/app.config.js.');
  }

  const iosProjectDirectory = path.join(
    projectRoot,
    'ios',
    IOSConfig.XcodeUtils.sanitizedName(projectName)
  );
  const iosSupportingDirectory = path.join(
    projectRoot,
    'ios',
    IOSConfig.XcodeUtils.sanitizedName(projectName),
    'Supporting'
  );
  const iconPath = path.join(iosProjectDirectory, 'Assets.xcassets', 'AppIcon.appiconset');

  return {
    projectName,
    iosProjectDirectory,
    iosSupportingDirectory,
    iconPath,
  };
}
