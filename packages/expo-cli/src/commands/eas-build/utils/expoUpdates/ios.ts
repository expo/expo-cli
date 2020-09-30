import { ExpoConfig, IOSConfig, projectHasModule } from '@expo/config';
import plist from '@expo/plist';
import { UserManager } from '@expo/xdl';
import * as fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import xcode from 'xcode';

import CommandError from '../../../../CommandError';
import { gitAddAsync } from '../../../../git';
import getConfigurationOptionsAsync from './getConfigurationOptions';
import isExpoUpdatesInstalled from './isExpoUpdatesInstalled';

function getIOSBuildScript(projectDir: string, exp: ExpoConfig) {
  const iOSBuildScriptPath = projectHasModule(
    'expo-updates/scripts/create-manifest-ios.sh',
    projectDir,
    exp
  );

  if (!iOSBuildScriptPath) {
    throw new Error(
      "Could not find the build script for iOS. This could happen in case of outdated 'node_modules'. Run 'npm install' to make sure that it's up-to-date."
    );
  }

  return path.relative(path.join(projectDir, 'ios'), iOSBuildScriptPath);
}

export async function setUpdatesVersionsIOSAsync({
  projectDir,
  exp,
}: {
  projectDir: string;
  exp: ExpoConfig;
}) {
  if (!isExpoUpdatesInstalled(projectDir)) {
    return;
  }

  const isUpdatesConfigured = await isUpdatesConfiguredIOSAsync(projectDir);

  if (!isUpdatesConfigured) {
    throw new CommandError(
      '"expo-updates" is installed, but not configured in the project. Please run "expo eas:build:init" first to configure "expo-updates"'
    );
  }

  await modifyExpoPlistAsync(projectDir, expoPlist => {
    const runtimeVersion = IOSConfig.Updates.getRuntimeVersion(exp);
    const sdkVersion = IOSConfig.Updates.getSDKVersion(exp);

    if (
      (runtimeVersion && expoPlist[IOSConfig.Updates.Config.RUNTIME_VERSION] === runtimeVersion) ||
      (sdkVersion && expoPlist[IOSConfig.Updates.Config.SDK_VERSION] === sdkVersion)
    ) {
      return expoPlist;
    }

    return IOSConfig.Updates.setVersionsConfig(exp, expoPlist);
  });
}

export async function configureUpdatesIOSAsync({
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
  const pbxprojPath = await getPbxprojPathAsync(projectDir);
  const project = await getXcodeProjectAsync(pbxprojPath);
  const bundleReactNative = await getBundleReactNativePhaseAsync(project);
  const iOSBuildScript = getIOSBuildScript(projectDir, exp);

  if (!bundleReactNative.shellScript.includes(iOSBuildScript)) {
    bundleReactNative.shellScript = `${bundleReactNative.shellScript.replace(
      /"$/,
      ''
    )}${iOSBuildScript}\\n"`;
  }

  await fs.writeFile(pbxprojPath, project.writeSync());

  await modifyExpoPlistAsync(projectDir, expoPlist => {
    return IOSConfig.Updates.setUpdatesConfig(exp, expoPlist, username);
  });
}

async function modifyExpoPlistAsync(projectDir: string, callback: (expoPlist: any) => any) {
  const pbxprojPath = await getPbxprojPathAsync(projectDir);
  const expoPlistPath = getExpoPlistPath(projectDir, pbxprojPath);

  let expoPlist = {};

  if (await fs.pathExists(expoPlistPath)) {
    const expoPlistContent = await fs.readFile(expoPlistPath, 'utf8');
    expoPlist = plist.parse(expoPlistContent);
  }

  const updatedExpoPlist = callback(expoPlist);

  if (updatedExpoPlist === expoPlist) {
    return;
  }

  const expoPlistContent = plist.build(updatedExpoPlist);

  await fs.mkdirp(path.dirname(expoPlistPath));
  await fs.writeFile(expoPlistPath, expoPlistContent);
  await gitAddAsync(expoPlistPath, { intentToAdd: true });
}

async function isUpdatesConfiguredIOSAsync(projectDir: string) {
  if (!isExpoUpdatesInstalled(projectDir)) {
    return true;
  }

  const { exp, username } = await getConfigurationOptionsAsync(projectDir);

  const pbxprojPath = await getPbxprojPathAsync(projectDir);
  const project = await getXcodeProjectAsync(pbxprojPath);
  const bundleReactNative = await getBundleReactNativePhaseAsync(project);
  const iOSBuildScript = getIOSBuildScript(projectDir, exp);

  if (!bundleReactNative.shellScript.includes(iOSBuildScript)) {
    return false;
  }

  const expoPlistPath = getExpoPlistPath(projectDir, pbxprojPath);

  if (!(await fs.pathExists(expoPlistPath))) {
    return false;
  }

  const expoPlist = await fs.readFile(expoPlistPath, 'utf8');
  const expoPlistData = plist.parse(expoPlist);

  return isMetadataSetIOS(expoPlistData, exp, username);
}

function isMetadataSetIOS(expoPlistData: any, exp: ExpoConfig, username: string | null) {
  const currentUpdateUrl = IOSConfig.Updates.getUpdateUrl(exp, username);

  if (
    isVersionsSetIOS(expoPlistData) &&
    currentUpdateUrl &&
    expoPlistData[IOSConfig.Updates.Config.UPDATE_URL] === currentUpdateUrl
  ) {
    return true;
  }

  return false;
}

function isVersionsSetIOS(expoPlistData: any) {
  if (
    expoPlistData[IOSConfig.Updates.Config.RUNTIME_VERSION] ||
    expoPlistData[IOSConfig.Updates.Config.SDK_VERSION]
  ) {
    return true;
  }

  return false;
}

async function getPbxprojPathAsync(projectDir: string) {
  const pbxprojPaths = await new Promise<string[]>((resolve, reject) =>
    glob('ios/*/project.pbxproj', { absolute: true, cwd: projectDir }, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    })
  );

  const pbxprojPath = pbxprojPaths.length > 0 ? pbxprojPaths[0] : undefined;

  if (!pbxprojPath) {
    throw new Error(`Could not find Xcode project in project directory: "${projectDir}"`);
  }

  return pbxprojPath;
}

async function getXcodeProjectAsync(pbxprojPath: string) {
  const project = xcode.project(pbxprojPath);

  await new Promise((resolve, reject) =>
    project.parse(err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  );

  return project;
}

function getExpoPlistPath(projectDir: string, pbxprojPath: string) {
  const xcodeprojPath = path.resolve(pbxprojPath, '..');
  const expoPlistPath = path.resolve(
    projectDir,
    'ios',
    path.basename(xcodeprojPath).replace(/\.xcodeproj$/, ''),
    'Supporting',
    'Expo.plist'
  );

  return expoPlistPath;
}

async function getBundleReactNativePhaseAsync(project: xcode.XcodeProject) {
  const scriptBuildPhase = project.hash.project.objects.PBXShellScriptBuildPhase;
  const bundleReactNative = Object.values(scriptBuildPhase).find(
    buildPhase => buildPhase.name === '"Bundle React Native code and images"'
  );

  if (!bundleReactNative) {
    throw new Error(`Couldn't find a build phase script for "Bundle React Native code and images"`);
  }

  return bundleReactNative;
}
