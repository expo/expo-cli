import { ExpoConfig, PackageJSONConfig, ProjectTarget } from '@expo/config';
import fs from 'fs-extra';
import path from 'path';

import * as ExponentTools from './detach/ExponentTools';
import * as IosPlist from './detach/IosPlist';
// @ts-ignore IosWorkspace not yet converted to TypeScript
import * as IosWorkspace from './detach/IosWorkspace';
import StandaloneContext from './detach/StandaloneContext';
import logger from './Logger';
import { writeArtifactSafelyAsync } from './tools/ArtifactUtils';

export type EmbeddedAssetsConfiguration = {
  projectRoot: string;
  pkg: PackageJSONConfig;
  exp: PublicConfig;
  releaseChannel?: string;
  iosManifestUrl: string;
  iosManifest: any;
  iosBundle: string;
  iosSourceMap: string | null;
  androidManifestUrl: string;
  androidManifest: any;
  androidBundle: string;
  androidSourceMap: string | null;
  target: ProjectTarget;
};

type PublicConfig = ExpoConfig & {
  sdkVersion: string;
};

export async function configureAsync(config: EmbeddedAssetsConfiguration) {
  await _maybeWriteArtifactsToDiskAsync(config);
  await _maybeConfigureExpoKitEmbeddedAssetsAsync(config);
  await _maybeConfigureExpoUpdatesEmbeddedAssetsAsync(config);
}

export function getEmbeddedManifestPath(
  platform: 'ios' | 'android',
  projectRoot: string,
  exp: PublicConfig
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
  exp: PublicConfig
): string {
  return path.join(_getDefaultEmbeddedAssetDir(platform, projectRoot, exp), 'app.manifest');
}

function _getDefaultEmbeddedBundlePath(
  platform: 'ios' | 'android',
  projectRoot: string,
  exp: PublicConfig
): string {
  return path.join(_getDefaultEmbeddedAssetDir(platform, projectRoot, exp), 'app.bundle');
}

function _getDefaultEmbeddedAssetDir(
  platform: 'ios' | 'android',
  projectRoot: string,
  exp: PublicConfig
): string {
  if (platform === 'ios') {
    const context = StandaloneContext.createUserContext(projectRoot, exp);
    const { supportingDirectory } = IosWorkspace.getPaths(context);
    return supportingDirectory;
  } else if (platform === 'android') {
    return path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
  } else {
    throw new Error('Embedding assets is not supported for platform ' + platform);
  }
}

async function _maybeWriteArtifactsToDiskAsync(config: EmbeddedAssetsConfiguration) {
  const {
    projectRoot,
    pkg,
    exp,
    iosManifest,
    iosBundle,
    iosSourceMap,
    androidManifest,
    androidBundle,
    androidSourceMap,
  } = config;

  let androidBundlePath;
  let androidManifestPath;
  let androidSourceMapPath;
  let iosBundlePath;
  let iosManifestPath;
  let iosSourceMapPath;

  // set defaults for expo-updates
  if (pkg.dependencies['expo-updates'] && config.target !== 'managed') {
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
  if (exp.android && exp.android.publishBundlePath) {
    androidBundlePath = exp.android.publishBundlePath;
  }
  if (exp.android && exp.android.publishManifestPath) {
    androidManifestPath = exp.android.publishManifestPath;
  }
  if (exp.android && exp.android.publishSourceMapPath) {
    androidSourceMapPath = exp.android.publishSourceMapPath;
  }
  if (exp.ios && exp.ios.publishBundlePath) {
    iosBundlePath = exp.ios.publishBundlePath;
  }
  if (exp.ios && exp.ios.publishManifestPath) {
    iosManifestPath = exp.ios.publishManifestPath;
  }
  if (exp.ios && exp.ios.publishSourceMapPath) {
    iosSourceMapPath = exp.ios.publishSourceMapPath;
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

  if (androidSourceMapPath && androidSourceMap) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'android.publishSourceMapPath',
      androidSourceMapPath,
      androidSourceMap
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

  if (iosSourceMapPath && iosSourceMap) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'ios.publishSourceMapPath',
      iosSourceMapPath,
      iosSourceMap
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
  if (!config.pkg.dependencies['expo-updates'] || config.target === 'managed') {
    return;
  }

  const { projectRoot, exp, releaseChannel, iosManifestUrl, androidManifestUrl } = config;

  const context = StandaloneContext.createUserContext(projectRoot, exp);
  const { supportingDirectory } = IosWorkspace.getPaths(context);

  // iOS expo-updates
  if (fs.existsSync(path.join(supportingDirectory, 'Expo.plist'))) {
    // This is an app with expo-updates installed, set properties in Expo.plist
    await IosPlist.modifyAsync(supportingDirectory, 'Expo', (configPlist: any) => {
      configPlist.EXUpdatesURL = iosManifestUrl;
      configPlist.EXUpdatesSDKVersion = exp.sdkVersion;
      if (releaseChannel) {
        configPlist.EXUpdatesReleaseChannel = releaseChannel;
      }
      return configPlist;
    });
  }

  // Android expo-updates
  let androidManifestXmlPath = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  let androidManifestXmlFile = fs.readFileSync(androidManifestXmlPath, 'utf8');
  let expoUpdateUrlRegex = /<meta-data[^>]+"expo.modules.updates.EXPO_UPDATE_URL"[^>]+\/>/;
  let expoSdkVersionRegex = /<meta-data[^>]+"expo.modules.updates.EXPO_SDK_VERSION"[^>]+\/>/;
  let expoReleaseChannelRegex = /<meta-data[^>]+"expo.modules.updates.EXPO_RELEASE_CHANNEL"[^>]+\/>/;

  let expoUpdateUrlTag = `<meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL" android:value="${androidManifestUrl}" />`;
  let expoSdkVersionTag = `<meta-data android:name="expo.modules.updates.EXPO_SDK_VERSION" android:value="${exp.sdkVersion}" />`;
  let expoReleaseChannelTag = `<meta-data android:name="expo.modules.updates.EXPO_RELEASE_CHANNEL" android:value="${releaseChannel}" />`;

  let tagsToInsert = [];
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
}
