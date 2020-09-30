import { AndroidConfig, ExpoConfig, projectHasModule } from '@expo/config';
import { UserManager } from '@expo/xdl';
import * as fs from 'fs-extra';
import path from 'path';

import CommandError from '../../../../CommandError';
import getConfigurationOptionsAsync from './getConfigurationOptions';
import isExpoUpdatesInstalled from './isExpoUpdatesInstalled';

function getAndroidBuildScript(projectDir: string, exp: ExpoConfig) {
  const androidBuildScriptPath = projectHasModule(
    'expo-updates/scripts/create-manifest-android.gradle',
    projectDir,
    exp
  );

  if (!androidBuildScriptPath) {
    throw new Error(
      "Could not find the build script for Android. This could happen in case of outdated 'node_modules'. Run 'npm install' to make sure that it's up-to-date."
    );
  }

  return `apply from: ${JSON.stringify(
    path.relative(path.join(projectDir, 'android', 'app'), androidBuildScriptPath)
  )}`;
}

export async function setUpdatesVersionsAndroidAsync({
  projectDir,
  exp,
}: {
  projectDir: string;
  exp: ExpoConfig;
}) {
  if (!isExpoUpdatesInstalled(projectDir)) {
    return;
  }

  const isUpdatesConfigured = await isUpdatesConfiguredAndroidAsync(projectDir);

  if (!isUpdatesConfigured) {
    throw new CommandError(
      '"expo-updates" is installed, but not configured in the project. Please run "expo eas:build:init" first to configure "expo-updates"'
    );
  }

  const {
    path: androidManifestPath,
    data: androidManifestJSON,
  } = await getAndroidManifestJSONAsync(projectDir);

  const runtimeVersion = AndroidConfig.Updates.getRuntimeVersion(exp);
  const sdkVersion = AndroidConfig.Updates.getSDKVersion(exp);

  const currentRuntimeVersion = getAndroidMetadataValue(
    androidManifestJSON,
    AndroidConfig.Updates.Config.RUNTIME_VERSION
  );

  const currentSdkVersion = getAndroidMetadataValue(
    androidManifestJSON,
    AndroidConfig.Updates.Config.SDK_VERSION
  );

  if (
    (runtimeVersion && runtimeVersion === currentRuntimeVersion) ||
    (sdkVersion && sdkVersion === currentSdkVersion)
  ) {
    return;
  }

  const result = await AndroidConfig.Updates.setVersionsConfig(exp, androidManifestJSON);

  await AndroidConfig.Manifest.writeAndroidManifestAsync(androidManifestPath, result);
}

export async function configureUpdatesAndroidAsync({
  projectDir,
  exp,
}: {
  projectDir: string;
  exp: ExpoConfig;
}) {
  if (!isExpoUpdatesInstalled(projectDir)) {
    return;
  }

  const username = await UserManager.getCurrentUsernameAsync();
  const buildGradlePath = getAndroidBuildGradlePath(projectDir);
  const buildGradleContent = await getAndroidBuildGradleContentAsync(buildGradlePath);

  if (!hasBuildScriptApply(buildGradleContent, projectDir, exp)) {
    const androidBuildScript = getAndroidBuildScript(projectDir, exp);

    await fs.writeFile(
      buildGradlePath,
      `${buildGradleContent}\n// Integration with Expo updates\n${androidBuildScript}\n`
    );
  }

  const {
    path: androidManifestPath,
    data: androidManifestJSON,
  } = await getAndroidManifestJSONAsync(projectDir);

  if (!isMetadataSetAndroid(androidManifestJSON, exp, username)) {
    const result = await AndroidConfig.Updates.setUpdatesConfig(exp, androidManifestJSON, username);

    await AndroidConfig.Manifest.writeAndroidManifestAsync(androidManifestPath, result);
  }
}

async function isUpdatesConfiguredAndroidAsync(projectDir: string) {
  if (!isExpoUpdatesInstalled(projectDir)) {
    return true;
  }

  const { exp, username } = await getConfigurationOptionsAsync(projectDir);

  const buildGradlePath = getAndroidBuildGradlePath(projectDir);
  const buildGradleContent = await getAndroidBuildGradleContentAsync(buildGradlePath);

  if (!hasBuildScriptApply(buildGradleContent, projectDir, exp)) {
    return false;
  }

  const { data: androidManifestJSON } = await getAndroidManifestJSONAsync(projectDir);

  if (!isMetadataSetAndroid(androidManifestJSON, exp, username)) {
    return false;
  }

  return true;
}

function getAndroidBuildGradlePath(projectDir: string) {
  const buildGradlePath = path.join(projectDir, 'android', 'app', 'build.gradle');

  return buildGradlePath;
}

async function getAndroidBuildGradleContentAsync(buildGradlePath: string) {
  if (!(await fs.pathExists(buildGradlePath))) {
    throw new Error(`Couldn't find gradle build script at ${buildGradlePath}`);
  }

  const buildGradleContent = await fs.readFile(buildGradlePath, 'utf-8');

  return buildGradleContent;
}

function hasBuildScriptApply(
  buildGradleContent: string,
  projectDir: string,
  exp: ExpoConfig
): boolean {
  const androidBuildScript = getAndroidBuildScript(projectDir, exp);

  return (
    buildGradleContent
      .split('\n')
      // Check for both single and double quotes
      .some(line => line === androidBuildScript || line === androidBuildScript.replace(/"/g, "'"))
  );
}

async function getAndroidManifestJSONAsync(projectDir: string) {
  const androidManifestPath = await AndroidConfig.Paths.getAndroidManifestAsync(projectDir);

  if (!androidManifestPath) {
    throw new Error(`Could not find AndroidManifest.xml in project directory: "${projectDir}"`);
  }

  const androidManifestJSON = await AndroidConfig.Manifest.readAndroidManifestAsync(
    androidManifestPath
  );

  return {
    path: androidManifestPath,
    data: androidManifestJSON,
  };
}

function isMetadataSetAndroid(
  androidManifestJSON: AndroidConfig.Manifest.Document,
  exp: ExpoConfig,
  username: string | null
): boolean {
  const currentUpdateUrl = AndroidConfig.Updates.getUpdateUrl(exp, username);

  const setUpdateUrl = getAndroidMetadataValue(
    androidManifestJSON,
    AndroidConfig.Updates.Config.UPDATE_URL
  );

  return Boolean(
    isVersionsSetAndroid(androidManifestJSON) &&
      currentUpdateUrl &&
      setUpdateUrl === currentUpdateUrl
  );
}

function isVersionsSetAndroid(androidManifestJSON: AndroidConfig.Manifest.Document): boolean {
  const runtimeVersion = getAndroidMetadataValue(
    androidManifestJSON,
    AndroidConfig.Updates.Config.RUNTIME_VERSION
  );

  const sdkVersion = getAndroidMetadataValue(
    androidManifestJSON,
    AndroidConfig.Updates.Config.SDK_VERSION
  );

  return Boolean(runtimeVersion || sdkVersion);
}

function getAndroidMetadataValue(
  androidManifestJSON: AndroidConfig.Manifest.Document,
  name: string
): string | undefined {
  const mainApplication = androidManifestJSON.manifest?.application?.filter(
    (e: any) => e['$']['android:name'] === '.MainApplication'
  )[0];

  if (mainApplication?.hasOwnProperty('meta-data')) {
    const item = mainApplication?.['meta-data']?.find((e: any) => e.$['android:name'] === name);

    return item?.$['android:value'];
  }

  return undefined;
}
