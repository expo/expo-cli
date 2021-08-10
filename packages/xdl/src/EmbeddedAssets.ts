import { ExpoAppManifest, getConfig, PackageJSONConfig, ProjectTarget } from '@expo/config';
import { IOSConfig } from '@expo/config-plugins';
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
  await _maybeConfigureExpoUpdatesEmbeddedAssetsAsync(config);
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

async function _maybeConfigureExpoUpdatesEmbeddedAssetsAsync(config: EmbeddedAssetsConfiguration) {
  if (!config.pkg.dependencies?.['expo-updates'] || config.target === 'managed') {
    return;
  }

  let isLikelyFirstPublish = false;

  const { projectRoot, exp, releaseChannel, iosManifestUrl, androidManifestUrl } = config;

  const { iosSupportingDirectory: supportingDirectory } = getIOSPaths(projectRoot);

  // iOS expo-updates
  if (fs.existsSync(path.join(supportingDirectory, 'Expo.plist'))) {
    // This is an app with expo-updates installed, set properties in Expo.plist
    await IosPlist.modifyAsync(supportingDirectory, 'Expo', (configPlist: any) => {
      if (configPlist.EXUpdatesURL === 'YOUR-APP-URL-HERE') {
        isLikelyFirstPublish = true;
      }
      configPlist.EXUpdatesURL = iosManifestUrl;
      configPlist.EXUpdatesSDKVersion = exp.sdkVersion;
      if (releaseChannel) {
        configPlist.EXUpdatesReleaseChannel = releaseChannel;
      }
      return configPlist;
    });
    await IosPlist.cleanBackupAsync(supportingDirectory, 'Expo', false);
  }

  // Android expo-updates
  const androidManifestXmlPath = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  const androidManifestXmlFile = fs.readFileSync(androidManifestXmlPath, 'utf8');
  const expoUpdateUrlRegex = /<meta-data[^>]+"expo.modules.updates.EXPO_UPDATE_URL"[^>]+\/>/;
  const expoSdkVersionRegex = /<meta-data[^>]+"expo.modules.updates.EXPO_SDK_VERSION"[^>]+\/>/;
  const expoReleaseChannelRegex = /<meta-data[^>]+"expo.modules.updates.EXPO_RELEASE_CHANNEL"[^>]+\/>/;

  const expoUpdateUrlTag = `<meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL" android:value="${androidManifestUrl}" />`;
  const expoSdkVersionTag = `<meta-data android:name="expo.modules.updates.EXPO_SDK_VERSION" android:value="${exp.sdkVersion}" />`;
  const expoReleaseChannelTag = `<meta-data android:name="expo.modules.updates.EXPO_RELEASE_CHANNEL" android:value="${releaseChannel}" />`;

  const tagsToInsert = [];
  if (androidManifestXmlFile.search(expoUpdateUrlRegex) < 0) {
    tagsToInsert.push(expoUpdateUrlTag);
  }
  if (androidManifestXmlFile.search(expoSdkVersionRegex) < 0) {
    tagsToInsert.push(expoSdkVersionTag);
  }
  if (releaseChannel && androidManifestXmlFile.search(expoReleaseChannelRegex) < 0) {
    tagsToInsert.push(expoReleaseChannelTag);
  }
  if (tagsToInsert.length) {
    // try to insert the meta-data tags that aren't found
    await ExponentTools.regexFileAsync(
      /<activity\s+android:name=".MainActivity"/,
      `${tagsToInsert.join('\n      ')}

  <activity
    android:name=".MainActivity"`,
      androidManifestXmlPath
    );
  }
  await ExponentTools.regexFileAsync(expoUpdateUrlRegex, expoUpdateUrlTag, androidManifestXmlPath);
  await ExponentTools.regexFileAsync(
    expoSdkVersionRegex,
    expoSdkVersionTag,
    androidManifestXmlPath
  );
  if (releaseChannel) {
    await ExponentTools.regexFileAsync(
      expoReleaseChannelRegex,
      expoReleaseChannelTag,
      androidManifestXmlPath
    );
  }

  if (isLikelyFirstPublish) {
    logger.global.warn(
      '🚀 It looks like this your first publish for this project! ' +
        "We've automatically set some configuration values in Expo.plist and AndroidManifest.xml. " +
        "You'll need to make a new build with these changes before you can download the update " +
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
