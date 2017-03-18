// Copyright 2015-present 650 Industries. All rights reserved.
/**
 * @flow
 */

'use strict';

import 'instapromise';

import mkdirp from 'mkdirp';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import glob from 'glob';
import uuid from 'node-uuid';
import yesno from 'yesno';

import {
  saveIconToPathAsync,
  spawnAsyncThrowError,
  spawnAsync,
  modifyIOSPropertyListAsync,
  cleanIOSPropertyListBackupAsync,
  configureIOSIconsAsync,
} from './ExponentTools';
import {
  configureStandaloneIOSInfoPlistAsync,
  configureStandaloneIOSShellPlistAsync,
} from './IosShellApp';
import {
  renderExponentViewPodspecAsync,
  renderPodfileAsync,
} from './IosPodsTools.js';

import Api from '../Api';
import ErrorCode from '../ErrorCode';
import * as ProjectUtils from '../project/ProjectUtils';
import UserManager from '../User';
import XDLError from '../XDLError';
import * as UrlUtils from '../UrlUtils';
import * as Utils from '../Utils';
import * as Versions from '../Versions';

const ANDROID_TEMPLATE_PKG = 'detach.app.template.pkg.name';
const ANDROID_TEMPLATE_COMPANY = 'detach.app.template.company.domain';
const ANDROID_TEMPLATE_NAME = 'DetachAppTemplate';

function _isDirectory(dir) {
  try {
    if (fs.statSync(dir).isDirectory()) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

function yesnoAsync(question) {
  return new Promise((resolve) => {
    yesno.ask(question, null, (ok) => {
      resolve(ok);
    });
  });
}

export async function detachAsync(projectRoot: string) {
  let user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error("Internal error -- somehow detach is being run in offline mode.");
  }

  let username = user.username;
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  let experienceName = `@${username}/${exp.slug}`;
  let experienceUrl = `exp://exp.host/${experienceName}`;

  // Check to make sure project isn't fully detached already
  let hasIosDirectory = _isDirectory(path.join(projectRoot, 'ios'));
  let hasAndroidDirectory = _isDirectory(path.join(projectRoot, 'android'));

  if (hasIosDirectory && hasAndroidDirectory) {
    throw new XDLError(ErrorCode.DIRECTORY_ALREADY_EXISTS, 'Error detaching. `ios` and `android` directories already exist.');
  }

  // Project was already detached on Windows or Linux
  if (!hasIosDirectory && hasAndroidDirectory && process.platform === 'darwin') {
    let response = await yesnoAsync(`This will add an Xcode project and leave your existing Android project alone. Enter 'yes' to continue:`);
    if (!response) {
      console.log('Exiting...');
      return false;
    }
  }

  if (hasIosDirectory && !hasAndroidDirectory) {
    throw new Error('`ios` directory already exists. Please remove it and try again.');
  }

  console.log('Validating project manifest...');
  const configName = await ProjectUtils.configFilenameAsync(projectRoot);
  if (!exp.name) {
    throw new Error(`${configName} is missing \`name\``);
  }

  if (!exp.android || !exp.android.package) {
    throw new Error(`${configName} is missing android.package field. See https://docs.expo.io/versions/latest/guides/configuration.html#package`);
  }

  if (!exp.sdkVersion) {
    throw new Error(`${configName} is missing \`sdkVersion\``);
  }
  const versions = await Versions.versionsAsync();
  let sdkVersionConfig = versions.sdkVersions[exp.sdkVersion];
  if (!sdkVersionConfig || !sdkVersionConfig.androidExpoViewUrl || !sdkVersionConfig.iosExpoViewUrl) {
    if (process.env.EXPO_VIEW_DIR) {
      console.warn(`Detaching is not supported for SDK ${exp.sdkVersion}; ignoring this because you provided EXPO_VIEW_DIR`);
      sdkVersionConfig = {};
    } else {
      throw new Error(`Detaching is not supported for SDK version ${exp.sdkVersion}`);
    }
  }

  if (process.platform !== 'darwin') {
    let response = await yesnoAsync(`Can't create an iOS project since you are not on macOS. You can rerun this command on macOS in the future to add an iOS project. Enter 'yes' to continue and just create an Android project:`);
    if (!response) {
      console.log('Exiting...');
      return false;
    }
  }

  // Modify exp.json
  exp.isDetached = true;

  if (!exp.detach) {
    exp.detach = {};
  }

  if (!exp.detach.scheme) {
    let detachedUUID = uuid.v4().replace(/-/g, '');
    exp.detach.scheme = `exp${detachedUUID}`;
  }

  let expoDirectory = path.join(projectRoot, '.expo-source');
  mkdirp.sync(expoDirectory);

  // iOS
  if (process.platform === 'darwin' && !hasIosDirectory) {
    let iosDirectory = path.join(expoDirectory, 'ios');
    rimraf.sync(iosDirectory);
    mkdirp.sync(iosDirectory);
    await detachIOSAsync(projectRoot, iosDirectory, exp.sdkVersion, experienceUrl, exp, sdkVersionConfig.iosExpoViewUrl);
    exp.detach.iosExpoViewUrl = sdkVersionConfig.iosExpoViewUrl;
  }

  // Android
  if (!hasAndroidDirectory) {
    let androidDirectory = path.join(expoDirectory, 'android');
    rimraf.sync(androidDirectory);
    mkdirp.sync(androidDirectory);
    await detachAndroidAsync(projectRoot, androidDirectory, exp.sdkVersion, experienceUrl, exp, sdkVersionConfig.androidExpoViewUrl);
    exp.detach.androidExpoViewUrl = sdkVersionConfig.androidExpoViewUrl;
  }

  console.log('Writing ExpoKit configuration...');
  // Update exp.json/app.json
  // if we're writing to app.json, we need to place the configuration under the expo key
  const nameToWrite = await ProjectUtils.configFilenameAsync(projectRoot);
  if (nameToWrite === 'app.json') {
    exp = { expo: exp };
  }
  await fs.promise.writeFile(path.join(projectRoot, nameToWrite), JSON.stringify(exp, null, 2));

  console.log('Finished detaching your project! Look in the `android` and `ios` directories for the respective native projects.');
  return true;
}

function getIosPaths(projectRoot, manifest) {
  let iosProjectDirectory = path.join(projectRoot, 'ios');
  let projectNameLabel = manifest.name;
  let projectName = projectNameLabel.replace(/[^a-z0-9_\-]/gi, '-').toLowerCase();
  return {
    iosProjectDirectory,
    projectName,
  };
}

/**
 *  Delete xcodeproj|xcworkspace under searchPath.
 *  Needed because extraneous xcode files will interfere with `react-native link`.
 */
async function cleanXCodeProjectsAsync(searchPath) {
  let xcodeFilesToDelete = await glob.promise(searchPath + '/**/*.@(xcodeproj|xcworkspace)');
  if (xcodeFilesToDelete) {
    for (let ii = 0; ii < xcodeFilesToDelete.length; ii++) {
      let toRemove = xcodeFilesToDelete[ii];
      if (fs.existsSync(toRemove)) { // needed because we may have recursively removed in past iteration
        if (_isDirectory(toRemove)) {
          rimraf.sync(toRemove);
        } else {
          await fs.promise.unlink(toRemove);
        }
      }
    }
  }
  return;
}

async function cleanVersionedReactNativeAsync(searchPath) {
  // TODO: make it possible to allow a version for the kernel
  let versionsToDelete = await glob.promise(searchPath + '/ABI*');
  if (versionsToDelete) {
    for (let ii = 0; ii < versionsToDelete.length; ii++) {
      let toRemove = versionsToDelete[ii];
      if (_isDirectory(toRemove)) {
        rimraf.sync(toRemove);
      }
    }
  }
  return;
}

async function configureDetachedVersionsPlistAsync(configFilePath, detachedSDKVersion, kernelSDKVersion) {
  await modifyIOSPropertyListAsync(configFilePath, 'EXSDKVersions', (versionConfig) => {
    versionConfig.sdkVersions = [detachedSDKVersion];
    versionConfig.detachedNativeVersions = {
      shell: detachedSDKVersion,
      kernel: kernelSDKVersion,
    };
    return versionConfig;
  });
}

async function configureDetachedIOSInfoPlistAsync(configFilePath, manifest) {
  let result = await modifyIOSPropertyListAsync(configFilePath, 'Info', (config) => {
    // add detached scheme
    if (manifest.isDetached && manifest.detach.scheme) {
      if (!config.CFBundleURLTypes) {
        config.CFBundleURLTypes = [{
          CFBundleURLSchemes: [],
        }];
      }
      config.CFBundleURLTypes[0].CFBundleURLSchemes.push(manifest.detach.scheme);
    }
    if (config.UIDeviceFamily) {
      delete config.UIDeviceFamily;
    }
    return config;
  });
  return result;
}

async function cleanPropertyListBackupsAsync(configFilePath) {
  await cleanIOSPropertyListBackupAsync(configFilePath, 'EXShell', false);
  await cleanIOSPropertyListBackupAsync(configFilePath, 'Info', false);
  await cleanIOSPropertyListBackupAsync(configFilePath, 'EXSDKVersions', false);
}

/**
 *  Create a detached Expo iOS app pointing at the given project.
 */
export async function detachIOSAsync(projectRoot: string, expoDirectory: string, sdkVersion: string, experienceUrl: string, manifest: any, expoViewUrl: string) {
  let {
    iosProjectDirectory,
    projectName,
  } = getIosPaths(projectRoot, manifest);

  let tmpExpoDirectory;
  if (process.env.EXPO_VIEW_DIR) {
    // Only for testing
    tmpExpoDirectory = process.env.EXPO_VIEW_DIR;
  } else {
    tmpExpoDirectory = path.join(projectRoot, 'temp-ios-directory');
    mkdirp.sync(tmpExpoDirectory);
    console.log('Downloading iOS code...');
    await Api.downloadAsync(expoViewUrl, tmpExpoDirectory, {extract: true});
  }

  console.log('Moving iOS project files...');
  // HEY: if you need other paths into the extracted archive, be sure and include them
  // when the archive is generated in `ios/pipeline.js`
  await Utils.ncpAsync(path.join(tmpExpoDirectory, 'ios'), `${expoDirectory}/ios`);
  await Utils.ncpAsync(path.join(tmpExpoDirectory, 'cpp'), `${expoDirectory}/cpp`);
  await Utils.ncpAsync(path.join(tmpExpoDirectory, 'exponent-view-template', 'ios'), iosProjectDirectory);
  // make sure generated stub exists
  let generatedExpoDir = path.join(expoDirectory, 'ios', 'Exponent', 'Generated');
  mkdirp.sync(generatedExpoDir);
  fs.closeSync(fs.openSync(path.join(generatedExpoDir, 'EXKeys.h'), 'w'));

  console.log('Naming iOS project...');
  await spawnAsyncThrowError('sed', [
    '-i', `''`, '--',
    `s/exponent-view-template/${projectName}/g`,
    `${iosProjectDirectory}/exponent-view-template.xcodeproj/project.pbxproj`,
  ]);
  await spawnAsyncThrowError('sed', [
    '-i', `''`, '--',
    `s/exponent-view-template/${projectName}/g`,
    `${iosProjectDirectory}/exponent-view-template.xcworkspace/contents.xcworkspacedata`,
  ]);
  await spawnAsyncThrowError('sed', [
    '-i', `''`,
    `s/exponent-view-template/${projectName}/g`,
    `${iosProjectDirectory}/exponent-view-template.xcodeproj/xcshareddata/xcschemes/exponent-view-template.xcscheme`,
  ]);
  await spawnAsync('/bin/mv', [`${iosProjectDirectory}/exponent-view-template`, `${iosProjectDirectory}/${projectName}`]);
  await spawnAsync('/bin/mv', [
    `${iosProjectDirectory}/exponent-view-template.xcodeproj/xcshareddata/xcschemes/exponent-view-template.xcscheme`,
    `${iosProjectDirectory}/exponent-view-template.xcodeproj/xcshareddata/xcschemes/${projectName}.xcscheme`,
  ]);
  await spawnAsync('/bin/mv', [`${iosProjectDirectory}/exponent-view-template.xcodeproj`, `${iosProjectDirectory}/${projectName}.xcodeproj`]);
  await spawnAsync('/bin/mv', [`${iosProjectDirectory}/exponent-view-template.xcworkspace`, `${iosProjectDirectory}/${projectName}.xcworkspace`]);

  console.log('Configuring iOS project...');
  let infoPlistPath = `${iosProjectDirectory}/${projectName}/Supporting`;
  let iconPath = `${iosProjectDirectory}/${projectName}/Assets.xcassets/AppIcon.appiconset`;
  await configureStandaloneIOSInfoPlistAsync(infoPlistPath, manifest);
  let infoPlist = await configureDetachedIOSInfoPlistAsync(infoPlistPath, manifest);
  await configureStandaloneIOSShellPlistAsync(infoPlistPath, manifest, experienceUrl);
  // TODO: logic for when kernel sdk version is different from detached sdk version
  await configureDetachedVersionsPlistAsync(infoPlistPath, sdkVersion, sdkVersion);
  await configureIOSIconsAsync(manifest, iconPath, projectRoot);
  // we don't pre-cache JS in this case, TODO: think about whether that's correct


  console.log('Configuring iOS dependencies...');
  let podName = sdkVersion === '14.0.0' ? 'ExponentView' : 'ExpoKit';
  await renderExponentViewPodspecAsync(
    path.join(tmpExpoDirectory, 'template-files', 'ios', `${podName}.podspec`),
    path.join(expoDirectory, `${podName}.podspec`),
    { IOS_EXPONENT_CLIENT_VERSION: infoPlist.EXClientVersion }
  );
  await renderPodfileAsync(
    path.join(tmpExpoDirectory, 'template-files', 'ios', `${podName}-Podfile`),
    path.join(iosProjectDirectory, 'Podfile'),
    {
      TARGET_NAME: projectName,
      EXPONENT_ROOT_PATH: path.relative(iosProjectDirectory, expoDirectory),
      REACT_NATIVE_PATH: path.relative(
        iosProjectDirectory,
        path.join(projectRoot, 'node_modules', 'react-native'),
      ),
    },
    sdkVersion
  );

  console.log('Cleaning up iOS...');
  await cleanPropertyListBackupsAsync(infoPlistPath);
  await cleanVersionedReactNativeAsync(path.join(expoDirectory, 'ios', 'versioned-react-native'));
  await cleanXCodeProjectsAsync(path.join(expoDirectory, 'ios'));

  if (!process.env.EXPO_VIEW_DIR) {
    rimraf.sync(tmpExpoDirectory);
  }

  // These files cause @providesModule naming collisions
  if (process.platform === 'darwin') {
    let rnFilesToDelete = await glob.promise(path.join(expoDirectory, 'ios') + '/**/*.@(js|json)');
    if (rnFilesToDelete) {
      for (let i = 0; i < rnFilesToDelete.length; i++) {
        await fs.promise.unlink(rnFilesToDelete[i]);
      }
    }
  }

  const podsInstructions = (sdkVersion === '14.0.0') ?
        '`cd ios && ./pod-install-exponent.sh`' :
        '`cd ios && pod install`';
  console.log(`iOS detach is complete! To configure iOS native dependencies, make sure you have the Cocoapods gem, then ${podsInstructions}\n`);
  return;
}

async function regexFileAsync(filename, regex, replace) {
  let file = await fs.promise.readFile(filename);
  let fileString = file.toString();
  await fs.promise.writeFile(filename, fileString.replace(regex, replace));
}

async function renamePackageAsync(directory, originalPkg, destPkg) {
  let originalSplitPackage = originalPkg.split('.');
  let originalDeepDirectory = directory;
  for (let i = 0; i < originalSplitPackage.length; i++) {
    originalDeepDirectory = path.join(originalDeepDirectory, originalSplitPackage[i]);
  }

  // copy files into temp directory
  let tmpDirectory = path.join(directory, 'tmp-exponent-directory');
  mkdirp.sync(tmpDirectory);
  await Utils.ncpAsync(originalDeepDirectory, tmpDirectory);

  // delete old package
  rimraf.sync(path.join(directory, originalSplitPackage[0]));

  // make new package
  let newSplitPackage = destPkg.split('.');
  let newDeepDirectory = directory;
  for (let i = 0; i < newSplitPackage.length; i++) {
    newDeepDirectory = path.join(newDeepDirectory, newSplitPackage[i]);
    mkdirp.sync(newDeepDirectory);
  }

  // copy from temp to new package
  await Utils.ncpAsync(tmpDirectory, newDeepDirectory);

  // delete temp
  rimraf.sync(tmpDirectory);
}

async function detachAndroidAsync(projectRoot, expoDirectory, sdkVersion, experienceUrl, manifest, expoViewUrl: string) {
  let tmpExpoDirectory;
  if (process.env.EXPO_VIEW_DIR) {
    // Only for testing
    tmpExpoDirectory = process.env.EXPO_VIEW_DIR;
  } else {
    tmpExpoDirectory = path.join(projectRoot, 'temp-android-directory');
    mkdirp.sync(tmpExpoDirectory);
    console.log('Downloading Android code...');
    await Api.downloadAsync(expoViewUrl, tmpExpoDirectory, {extract: true});
  }

  let androidProjectDirectory = path.join(projectRoot, 'android');

  console.log('Moving Android project files...');

  await Utils.ncpAsync(path.join(tmpExpoDirectory, 'android', 'maven'), path.join(expoDirectory, 'maven'));
  await Utils.ncpAsync(path.join(tmpExpoDirectory, 'android', 'detach-scripts'), path.join(expoDirectory, 'detach-scripts'));
  await Utils.ncpAsync(path.join(tmpExpoDirectory, 'exponent-view-template', 'android'), androidProjectDirectory);
  if (process.env.EXPO_VIEW_DIR) {
    rimraf.sync(path.join(androidProjectDirectory, 'build'));
    rimraf.sync(path.join(androidProjectDirectory, 'app', 'build'));
  }

  // Fix up app/build.gradle
  console.log('Configuring Android project...');
  let appBuildGradle = path.join(androidProjectDirectory, 'app', 'build.gradle');
  await regexFileAsync(appBuildGradle, /\/\* UNCOMMENT WHEN DISTRIBUTING/g, '');
  await regexFileAsync(appBuildGradle, /END UNCOMMENT WHEN DISTRIBUTING \*\//g, '');
  await regexFileAsync(appBuildGradle, `compile project(':expoview')`, '');

  // Fix AndroidManifest
  let androidManifest = path.join(androidProjectDirectory, 'app', 'src', 'main', 'AndroidManifest.xml');
  await regexFileAsync(androidManifest, 'PLACEHOLDER_DETACH_SCHEME', manifest.detach.scheme);

  // Fix MainActivity
  let mainActivity = path.join(androidProjectDirectory, 'app', 'src', 'main', 'java', 'detach', 'app', 'template', 'pkg', 'name', 'MainActivity.java');
  await regexFileAsync(mainActivity, 'TEMPLATE_INITIAL_URL', experienceUrl);

  // Fix package name
  let packageName = manifest.android.package;
  await renamePackageAsync(path.join(androidProjectDirectory, 'app', 'src', 'main', 'java'), ANDROID_TEMPLATE_PKG, packageName);
  await renamePackageAsync(path.join(androidProjectDirectory, 'app', 'src', 'test', 'java'), ANDROID_TEMPLATE_PKG, packageName);
  await renamePackageAsync(path.join(androidProjectDirectory, 'app', 'src', 'androidTest', 'java'), ANDROID_TEMPLATE_PKG, packageName);

  let packageNameMatches = await glob.promise(androidProjectDirectory + '/**/*.@(java|gradle|xml)');
  if (packageNameMatches) {
    let oldPkgRegex = new RegExp(`${ANDROID_TEMPLATE_PKG.replace(/\./g, '\\\.')}`, 'g');
    for (let i = 0; i < packageNameMatches.length; i++) {
      await regexFileAsync(packageNameMatches[i], oldPkgRegex, packageName);
    }
  }

  // Fix app name
  console.log('Naming Android project...');
  let appName = manifest.name;
  await regexFileAsync(path.resolve(androidProjectDirectory, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), ANDROID_TEMPLATE_NAME, appName);

  // Fix image
  let icon = manifest.icon;
  if (icon) {
    let iconMatches = await glob.promise(path.join(androidProjectDirectory, 'app', 'src', 'main', 'res') + '/**/ic_launcher.png');
    if (iconMatches) {
      for (let i = 0; i < iconMatches.length; i++) {
        await fs.promise.unlink(iconMatches[i]);
        // TODO: make more efficient
        await saveIconToPathAsync(projectRoot, icon, iconMatches[i]);
      }
    }
  }

  // Clean up
  console.log('Cleaning up Android...');
  if (!process.env.EXPO_VIEW_DIR) {
    rimraf.sync(tmpExpoDirectory);
  }
  console.log('Android detach is complete!\n');
}

export async function prepareDetachedBuildAsync(projectDir: string, args: any) {
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  if (args.platform === 'ios') {
    let {
      iosProjectDirectory,
      projectName,
    } = getIosPaths(projectDir, exp);

    console.log(`Preparing iOS build at ${iosProjectDirectory}...`);
    // These files cause @providesModule naming collisions
    // but are not available until after `pod install` has run.
    let podsDirectory = path.join(iosProjectDirectory, 'Pods');
    if (!_isDirectory(podsDirectory)) {
      throw new Error(`Can't find directory ${podsDirectory}, make sure you've run pod install.`);
    }
    let rnPodDirectory = path.join(podsDirectory, 'React');
    if (_isDirectory(rnPodDirectory)) {
      let rnFilesToDelete = await glob.promise(rnPodDirectory + '/**/*.@(js|json)');
      if (rnFilesToDelete) {
        for (let i = 0; i < rnFilesToDelete.length; i++) {
          await fs.promise.unlink(rnFilesToDelete[i]);
        }
      }
    }
    // insert expo development url into iOS config
    if (!args.skipXcodeConfig) {
      let devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);
      let configFilePath = path.join(iosProjectDirectory, projectName, 'Supporting');
      await modifyIOSPropertyListAsync(configFilePath, 'EXShell', (shellConfig) => {
        shellConfig.developmentUrl = devUrl;
        return shellConfig;
      });
    }
  } else {
    let androidProjectDirectory = path.join(projectDir, 'android');
    let expoBuildConstantsMatches = await glob.promise(androidProjectDirectory + '/**/ExponentBuildConstants.java');
    if (expoBuildConstantsMatches && expoBuildConstantsMatches.length) {
      let expoBuildConstants = expoBuildConstantsMatches[0];
      let devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);
      await regexFileAsync(expoBuildConstants, /DEVELOPMENT_URL \= \"[^\"]*\"\;/, `DEVELOPMENT_URL = "${devUrl}";`);
    }
  }
}
