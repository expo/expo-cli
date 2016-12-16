// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import 'instapromise';

import {
  saveUrlToPathAsync,
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

import ErrorCode from '../ErrorCode';
import * as ProjectUtils from '../project/ProjectUtils';
import * as User from '../User';
import XDLError from '../XDLError';
import * as UrlUtils from '../UrlUtils';
import * as Utils from '../Utils';

import mkdirp from 'mkdirp';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import glob from 'glob';
import uuid from 'node-uuid';
import yesno from 'yesno';

const EXPONENT_SRC_URL = 'https://github.com/exponentjs/exponent.git';
const EXPONENT_ARCHIVE_URL = 'https://api.github.com/repos/exponentjs/exponent/tarball/master';
const ANDROID_TEMPLATE_PKG = 'detach.app.template.pkg.name';
const ANDROID_TEMPLATE_COMPANY = 'detach.app.template.company.domain';
const ANDROID_TEMPLATE_NAME = 'DetachAppTemplate';

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
    if (manifest.isDetached && manifest.detachedScheme) {
      if (!config.CFBundleURLTypes) {
        config.CFBundleURLTypes = [{
          CFBundleURLSchemes: [],
        }];
      }
      config.CFBundleURLTypes[0].CFBundleURLSchemes.push(manifest.detachedScheme);
    }
    if (config.UIDeviceFamily) {
      delete config.UIDeviceFamily;
    }
    return config;
  });
  return result;
}

async function cleanPropertyListBackupsAsync(configFilePath) {
  console.log('Cleaning up plist...');
  await cleanIOSPropertyListBackupAsync(configFilePath, 'EXShell', false);
  await cleanIOSPropertyListBackupAsync(configFilePath, 'Info', false);
  await cleanIOSPropertyListBackupAsync(configFilePath, 'EXSDKVersions', false);
}

function isDirectory(dir) {
  try {
    if (fs.statSync(dir).isDirectory()) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

export async function detachAsync(projectRoot) {
  let user = await User.getCurrentUserAsync();
  let username = user.username;
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  let experienceName = `@${username}/${exp.slug}`;
  let experienceUrl = `exp://exp.host/${experienceName}`;

  // Check to make sure project isn't fully detached already
  let hasIosDirectory = isDirectory(path.join(projectRoot, 'ios'));
  let hasAndroidDirectory = isDirectory(path.join(projectRoot, 'android'));

  if (hasIosDirectory && hasAndroidDirectory) {
    throw new XDLError(ErrorCode.DIRECTORY_ALREADY_EXISTS, 'Error detaching. `ios` and `android` directories already exist.');
  }

  // Project was already detached on Windows or Linux
  if (!hasIosDirectory && hasAndroidDirectory && process.platform === 'darwin') {
    let response = await yesno.promise.ask(`This will add an Xcode project and leave your existing Android project alone. Enter 'yes' to continue:`, null);
    if (!response) {
      console.log('Exiting...');
      return false;
    }
  }

  if (hasIosDirectory && !hasAndroidDirectory) {
    throw new Error('`ios` directory already exists. Please remove it and try again.');
  }

  console.log('Validating project manifest...');
  if (!exp.name) {
    throw new Error('exp.json is missing `name`');
  }

  if (!exp.android || !exp.android.package) {
    throw new Error('exp.json is missing android.package field. See https://docs.getexponent.com/versions/latest/guides/configuration.html#package');
  }

  if (process.platform !== 'darwin') {
    let response = await yesno.promise.ask(`Can't create an iOS project since you are not on macOS. You can rerun this command on macOS in the future to add an iOS project. Enter 'yes' to continue and just create an Android project:`, null);
    if (!response) {
      console.log('Exiting...');
      return false;
    }
  }

  // Modify exp.json
  if (!exp.isDetached || !exp.detachedScheme) {
    exp.isDetached = true;
    let detachedUUID = uuid.v4().replace(/-/g, '');
    exp.detachedScheme = `exp${detachedUUID}`;
    await fs.promise.writeFile(path.join(projectRoot, 'exp.json'), JSON.stringify(exp, null, 2));
  }

  // Download exponent repo
  console.log('Downloading Exponent kernel...');
  let tmpExponentDirectory = path.join(projectRoot, 'exponent-src-tmp');
  // TODO: Make this method work
  // await spawnAsync(`/usr/bin/curl -L ${EXPONENT_ARCHIVE_URL} | tar xzf -`, null, { shell: true });
  await spawnAsyncThrowError('/usr/bin/git', ['clone', EXPONENT_SRC_URL, tmpExponentDirectory]);

  let exponentDirectory = path.join(projectRoot, 'exponent');
  mkdirp.sync(exponentDirectory);

  // iOS
  if (process.platform === 'darwin' && !hasIosDirectory) {
    await detachIOSAsync(projectRoot, tmpExponentDirectory, exponentDirectory, exp.sdkVersion, experienceUrl, exp);
  }

  // Android
  if (!hasAndroidDirectory) {
    await detachAndroidAsync(projectRoot, tmpExponentDirectory, exponentDirectory, exp.sdkVersion, experienceUrl, exp);
  }

  // Clean up
  console.log('Cleaning up...');
  await spawnAsync('/bin/rm', ['-rf', tmpExponentDirectory]);

  // These files cause @providesModule naming collisions
  if (process.platform === 'darwin') {
    let rnFilesToDelete = await glob.promise(path.join(exponentDirectory, 'ios', 'versioned-react-native') + '/**/*.@(js|json)');
    if (rnFilesToDelete) {
      for (let i = 0; i < rnFilesToDelete.length; i++) {
        await fs.promise.unlink(rnFilesToDelete[i]);
      }
    }
  }

  return true;
}

async function capturePathAsync(outputFile) {
  if (process.platform !== 'win32') {
    let path = process.env.PATH;
    let output = (path) ? `PATH=$PATH:${path}` : '';
    await fs.promise.writeFile(outputFile, output);
  }
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
        if (isDirectory(toRemove)) {
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
      if (isDirectory(toRemove)) {
        rimraf.sync(toRemove);
      }
    }
  }
  return;
}

/**
 *  Create a detached Exponent iOS app pointing at the given project.
 *  @param args.url url of the Exponent project.
 *  @param args.outputDirectory directory to create the detached project.
 */
export async function detachIOSAsync(projectRoot, tmpExponentDirectory, exponentDirectory, sdkVersion, experienceUrl, manifest) {
  let {
    iosProjectDirectory,
    projectName,
  } = getIosPaths(projectRoot, manifest);

  console.log('Moving iOS project files...');
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'ios'), `${exponentDirectory}/ios`);
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'cpp'), `${exponentDirectory}/cpp`);
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'exponent-view-template', 'ios'), iosProjectDirectory);
  // make sure generated stub exists
  let generatedExponentDir = path.join(exponentDirectory, 'ios', 'Exponent', 'Generated');
  mkdirp.sync(generatedExponentDir);
  fs.closeSync(fs.openSync(path.join(generatedExponentDir, 'EXKeys.h'), 'w'));

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
  await configureIOSIconsAsync(manifest, iconPath);
  // we don't pre-cache JS in this case, TODO: think about whether that's correct

  console.log('Configuring iOS dependencies...');
  await renderExponentViewPodspecAsync(
    path.join(tmpExponentDirectory, 'template-files', 'ios', 'ExponentView.podspec'),
    path.join(exponentDirectory, 'ExponentView.podspec'),
    { IOS_EXPONENT_CLIENT_VERSION: infoPlist.EXClientVersion }
  );
  await renderPodfileAsync(
    path.join(tmpExponentDirectory, 'template-files', 'ios', 'ExponentView-Podfile'),
    path.join(iosProjectDirectory, 'Podfile'),
    {
      TARGET_NAME: projectName,
      EXPONENT_ROOT_PATH: '../exponent',
    }
  );
  await capturePathAsync(path.join(exponentDirectory, 'exponent-path.sh'));

  console.log('Cleaning up iOS...');
  await cleanPropertyListBackupsAsync(infoPlistPath);
  await cleanVersionedReactNativeAsync(path.join(exponentDirectory, 'ios', 'versioned-react-native'));
  await cleanXCodeProjectsAsync(path.join(exponentDirectory, 'ios'));

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

async function detachAndroidAsync(projectRoot, tmpExponentDirectory, exponentDirectory, sdkVersion, experienceUrl, manifest) {
  let androidProjectDirectory = path.join(projectRoot, 'android');

  console.log('Moving Android project files...');

  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'android', 'maven'), path.join(exponentDirectory, 'maven'));
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'exponent-view-template', 'android'), androidProjectDirectory);

  // Fix up app/build.gradle
  console.log('Configuring Android project...');
  let appBuildGradle = path.join(androidProjectDirectory, 'app', 'build.gradle');
  await regexFileAsync(appBuildGradle, '/* UNCOMMENT WHEN DISTRIBUTING', '');
  await regexFileAsync(appBuildGradle, 'END UNCOMMENT WHEN DISTRIBUTING */', '');
  await regexFileAsync(appBuildGradle, `compile project(':exponentview')`, '');

  // Fix AndroidManifest
  let androidManifest = path.join(androidProjectDirectory, 'app', 'src', 'main', 'AndroidManifest.xml');
  await regexFileAsync(androidManifest, 'PLACEHOLDER_DETACH_SCHEME', manifest.detachedScheme);

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
  let iconUrl = manifest.iconUrl;
  if (iconUrl) {
    let iconMatches = await glob.promise(path.join(androidProjectDirectory, 'app', 'src', 'main', 'res') + '/**/ic_launcher.png');
    if (iconMatches) {
      for (let i = 0; i < iconMatches.length; i++) {
        await fs.promise.unlink(iconMatches[i]);
        // TODO: make more efficient
        await saveUrlToPathAsync(iconUrl, iconMatches[i]);
      }
    }
  }
}

export async function prepareDetachedBuildAsync(projectDir, args) {
  if (args.platform !== 'ios') {
    throw new Error('This command is only available for --platform ios');
  }
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  let {
    iosProjectDirectory,
    projectName,
  } = getIosPaths(projectDir, exp);

  console.log(`Preparing iOS build at ${iosProjectDirectory}...`);
  // These files cause @providesModule naming collisions
  // but are not available until after `pod install` has run.
  let podsDirectory = path.join(iosProjectDirectory, 'Pods');
  if (!isDirectory(podsDirectory)) {
    throw new Error(`Can't find directory ${podsDirectory}, make sure you've run pod install.`);
  }
  let rnPodDirectory = path.join(podsDirectory, 'React');
  if (isDirectory(rnPodDirectory)) {
    let rnFilesToDelete = await glob.promise(rnPodDirectory + '/**/*.@(js|json)');
    if (rnFilesToDelete) {
      for (let i = 0; i < rnFilesToDelete.length; i++) {
        await fs.promise.unlink(rnFilesToDelete[i]);
      }
    }
  }
  // insert exponent development url into iOS config
  let devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);
  let configFilePath = path.join(iosProjectDirectory, projectName, 'Supporting');
  await modifyIOSPropertyListAsync(configFilePath, 'EXShell', (shellConfig) => {
    shellConfig.developmentUrl = devUrl;
    return shellConfig;
  });
  return;
}
