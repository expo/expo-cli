// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import {
  getManifestAsync,
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

const EXPONENT_SRC_URL = 'https://github.com/exponentjs/exponent.git';
const EXPONENT_ARCHIVE_URL = 'https://api.github.com/repos/exponentjs/exponent/tarball/master';
const DETACH_DIRECTORIES = ['exponent', 'ios', 'android'];

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

  let tmpExponentDirectory = path.join(projectRoot, 'exponent-src-tmp');

  // Download exponent repo
  console.log('Downloading Exponent kernel...');
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
    projectName,
    '../exponent',
    path.join(tmpExponentDirectory, 'template-files', 'ios', 'ExponentView-Podfile'),
    path.join(iosProjectDirectory, 'Podfile')
  );

  console.log('Cleaning up iOS...');
  await cleanPropertyListBackupsAsync(infoPlistPath);

  return;
}

async function detachAndroidAsync(projectRoot, tmpExponentDirectory, exponentDirectory, sdkVersion, experienceUrl, manifest) {
  let androidProjectDirectory = path.join(projectRoot, 'android');

  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'android', 'maven'), path.join(exponentDirectory, 'maven'));
  await Utils.ncpAsync(path.join(tmpExponentDirectory, 'exponent-view-template', 'android'), androidProjectDirectory);
}
