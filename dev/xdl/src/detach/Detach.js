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
import Logger from '../Logger';
import XDLError from '../XDLError';
import * as Utils from '../Utils';

import mkdirp from 'mkdirp';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import glob from 'glob';
import uuid from 'node-uuid';

const EXPONENT_SRC_URL = 'https://github.com/exponentjs/exponent.git';
const EXPONENT_ARCHIVE_URL = 'https://api.github.com/repos/exponentjs/exponent/tarball/master';
const DETACH_DIRECTORIES = ['exponent', 'ios', 'android'];
const ANDROID_TEMPLATE_PKG = 'detach.app.template.pkg.name';
const ANDROID_TEMPLATE_COMPANY = 'detach.app.template.company.domain';
const ANDROID_TEMPLATE_NAME = 'DetachAppTemplate';

function validateManifest(manifest) {
  if (!manifest.name) {
    throw new Error('Manifest is missing `name`');
  }
  return manifest;
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

  console.log('Validating project manifest...');
  exp = validateManifest(exp);

  // Check to make sure project isn't detached already
  let badDirectories = [];
  for (let i = 0; i < DETACH_DIRECTORIES.length; i++) {
    if (isDirectory(path.join(projectRoot, DETACH_DIRECTORIES[i]))) {
      badDirectories.push(DETACH_DIRECTORIES[i]);
    }
  }

  if (badDirectories.length > 0) {
    throw new XDLError(ErrorCode.DIRECTORY_ALREADY_EXISTS, `Error detaching. Please remove ${badDirectories.join(', ')} director${badDirectories.length === 1 ? 'y' : 'ies'} first. Are you sure you aren't already detached?`);
  }

  // Modify exp.json
  exp.isDetached = true;
  let detachedUUID = uuid.v4().replace(/-/g, '');
  exp.detachedScheme = `exp${detachedUUID}`;
  await fs.promise.writeFile(path.join(projectRoot, 'exp.json'), JSON.stringify(exp, null, 2));

  // Download exponent repo
  console.log('Downloading Exponent kernel...');
  let tmpExponentDirectory = path.join(projectRoot, 'exponent-src-tmp');
  // TODO: Make this method work
  // await spawnAsync(`/usr/bin/curl -L ${EXPONENT_ARCHIVE_URL} | tar xzf -`, null, { shell: true });
  await spawnAsyncThrowError('/usr/bin/git', ['clone', EXPONENT_SRC_URL, tmpExponentDirectory]);

  let exponentDirectory = path.join(projectRoot, 'exponent');
  mkdirp.sync(exponentDirectory);

  // iOS
  await detachIOSAsync(projectRoot, tmpExponentDirectory, exponentDirectory, exp.sdkVersion, experienceUrl, exp);

  // Android
  await detachAndroidAsync(projectRoot, tmpExponentDirectory, exponentDirectory, exp.sdkVersion, experienceUrl, exp);

  // Clean up
  console.log('Cleaning up...');
  await spawnAsync('/bin/rm', ['-rf', tmpExponentDirectory]);

  // These files cause @providesModule naming collisions
  let rnFilesToDelete = await glob.promise(path.join(exponentDirectory, 'ios', 'versioned-react-native') + '/**/*.@(js|json)');
  if (rnFilesToDelete) {
    for (let i = 0; i < rnFilesToDelete.length; i++) {
      await fs.promise.unlink(rnFilesToDelete[i]);
    }
  }
}

/**
 *  Create a detached Exponent iOS app pointing at the given project.
 *  @param args.url url of the Exponent project.
 *  @param args.outputDirectory directory to create the detached project.
 */
export async function detachIOSAsync(projectRoot, tmpExponentDirectory, exponentDirectory, sdkVersion, experienceUrl, manifest) {
  if (process.platform === 'win32') {
    return;
  }

  let iosProjectDirectory = path.join(projectRoot, 'ios');
  let projectNameLabel = manifest.name;
  let projectName = projectNameLabel.replace(/[^a-z0-9_\-]/gi, '-').toLowerCase();

  console.log('Moving iOS project files...');
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'ios'), `${exponentDirectory}/ios`);
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'cpp'), `${exponentDirectory}/cpp`);
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'exponent-view-template', 'ios'), iosProjectDirectory);

  console.log('Naming project...');
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

  console.log('Configuring project...');
  let infoPlistPath = `${iosProjectDirectory}/${projectName}/Supporting`;
  let iconPath = `${iosProjectDirectory}/${projectName}/Assets.xcassets/AppIcon.appiconset`;
  await configureStandaloneIOSInfoPlistAsync(infoPlistPath, manifest);
  await configureStandaloneIOSShellPlistAsync(infoPlistPath, manifest, experienceUrl);
  // TODO: logic for when kernel sdk version is different from detached sdk version
  await configureDetachedVersionsPlistAsync(infoPlistPath, sdkVersion, sdkVersion);
  await configureIOSIconsAsync(manifest, iconPath);
  // we don't pre-cache JS in this case, TODO: think about whether that's correct

  console.log('Configuring dependencies...');
  await renderExponentViewPodspecAsync(
    path.join(tmpExponentDirectory, 'template-files', 'ios', 'ExponentView.podspec'),
    path.join(exponentDirectory, 'ExponentView.podspec')
  );
  await renderPodfileAsync(
    path.join(tmpExponentDirectory, 'template-files', 'ios', 'ExponentView-Podfile'),
    path.join(iosProjectDirectory, 'Podfile'),
    {
      TARGET_NAME: projectName,
      EXPONENT_ROOT_PATH: '../exponent',
    }
  );

  console.log('Cleaning up iOS...');
  await cleanPropertyListBackupsAsync(infoPlistPath);

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

  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'android', 'maven'), path.join(exponentDirectory, 'maven'));
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'exponent-view-template', 'android'), androidProjectDirectory);

  // Fix up app/build.gradle
  let appBuildGradle = path.join(androidProjectDirectory, 'app', 'build.gradle');
  await regexFileAsync(appBuildGradle, '/* UNCOMMENT WHEN DISTRIBUTING', '');
  await regexFileAsync(appBuildGradle, 'END UNCOMMENT WHEN DISTRIBUTING */', '');
  await regexFileAsync(appBuildGradle, `compile project(':exponentview')`, '');

  // Fix AndroidManifest
  let androidManifest = path.join(androidProjectDirectory, 'app', 'src', 'main', 'AndroidManifest.xml');
  await regexFileAsync(androidManifest, 'PLACEHOLDER_DETACH_SCHEME', manifest.detachedScheme);

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
