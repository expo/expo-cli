import { ExpoConfig, PackageJSONConfig } from '@expo/config';
import fs from 'fs-extra';
import path from 'path';

import * as ExponentTools from './detach/ExponentTools';
import * as IosPlist from './detach/IosPlist';
// @ts-ignore IosWorkspace not yet converted to TypeScript
import * as IosWorkspace from './detach/IosWorkspace';
import StandaloneContext from './detach/StandaloneContext';
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
};

type PublicConfig = ExpoConfig & {
  sdkVersion: string;
};

export async function configureAsync(config: EmbeddedAssetsConfiguration) {
  await _maybeWriteArtifactsToDiskAsync(config);
  await _maybeConfigureExpoKitEmbeddedAssetsAsync(config);
  await _maybeConfigureExpoUpdatesEmbeddedAssetsAsync(config);
}

async function _maybeWriteArtifactsToDiskAsync(config: EmbeddedAssetsConfiguration) {
  const {
    projectRoot,
    exp,
    iosManifest,
    iosBundle,
    iosSourceMap,
    androidManifest,
    androidBundle,
    androidSourceMap,
  } = config;

  if (exp.android && exp.android.publishBundlePath) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'android.publishBundlePath',
      exp.android.publishBundlePath,
      androidBundle
    );
  }

  if (exp.ios && exp.ios.publishBundlePath) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'ios.publishBundlePath',
      exp.ios.publishBundlePath,
      iosBundle
    );
  }

  if (exp.android && exp.android.publishSourceMapPath && androidSourceMap) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'android.publishSourceMapPath',
      exp.android.publishSourceMapPath,
      androidSourceMap
    );
  }

  if (exp.ios && exp.ios.publishSourceMapPath && iosSourceMap) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'ios.publishSourceMapPath',
      exp.ios.publishSourceMapPath,
      iosSourceMap
    );
  }

  if (exp.ios && exp.ios.publishManifestPath) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'ios.publishManifestPath',
      exp.ios.publishManifestPath,
      JSON.stringify(iosManifest)
    );
  }

  if (exp.android && exp.android.publishManifestPath) {
    await writeArtifactSafelyAsync(
      projectRoot,
      'android.publishManifestPath',
      exp.android.publishManifestPath,
      JSON.stringify(androidManifest)
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
  if (!config.pkg.dependencies['expo-updates']) {
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
