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

function validateArgs(args) {
  if (!args.outputDirectory) {
    throw new Error(`Must specify --outputDirectory <path to create detached project>`);
  }
  if (!args.sdkVersion) {
    // TODO: maybe just default to newest?
    // we will need to figure out newest SDK version anyway to configure the kernel properly.
    throw new Error(`Must specify --sdkVersion <sdk version of project to detach>`);
  }
  if (!args.url) {
    throw new Error(`Must specify --url <url of project to detach>`);
  }
  return args;
}

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
  console.log('Cleaning up...');
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

  await detachIOSAsync({
    outputDirectory: projectRoot,
    sdkVersion: exp.sdkVersion,
    url: experienceUrl,
  }, exp);
}

/**
 *  Create a detached Exponent iOS app pointing at the given project.
 *  @param args.url url of the Exponent project.
 *  @param args.outputDirectory directory to create the detached project.
 */
export async function detachIOSAsync(args, manifest) {
  if (process.platform === 'win32') {
    return;
  }

  args = validateArgs(args);

  console.log('Validating project manifest...');
  manifest = validateManifest(manifest);

  let tmpExponentDirectory = path.join(args.outputDirectory, 'exponent-src-tmp');
  let exponentDirectory = path.join(args.outputDirectory, 'exponent');
  let iosProjectDirectory = path.join(args.outputDirectory, 'ios');
  let projectNameLabel = manifest.name;
  let projectName = projectNameLabel.replace(/[^a-z0-9_\-]/gi, '-').toLowerCase();

  console.log('Downloading Exponent kernel...');
  // TODO: Make this method work
  // await spawnAsync(`/usr/bin/curl -L ${EXPONENT_ARCHIVE_URL} | tar xzf -`, null, { shell: true });
  await spawnAsyncThrowError('/usr/bin/git', ['clone', EXPONENT_SRC_URL, tmpExponentDirectory]);

  console.log('Moving project files...');
  mkdirp.sync(exponentDirectory);
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
  await configureStandaloneIOSShellPlistAsync(infoPlistPath, manifest, args.url);
  // TODO: logic for when kernel sdk version is different from detached sdk version
  await configureDetachedVersionsPlistAsync(infoPlistPath, args.sdkVersion, args.sdkVersion);
  await configureIOSIconsAsync(manifest, iconPath);
  // we don't pre-cache JS in this case, TODO: think about whether that's correct

  console.log('Configuring dependencies...');
  await renderExponentViewPodspecAsync(`${tmpExponentDirectory}/template-files/ios/ExponentView.podspec`, `${exponentDirectory}/ExponentView.podspec`);
  await renderPodfileAsync(projectName, `${tmpExponentDirectory}/template-files/ios/ExponentView-Podfile`, `${iosProjectDirectory}/Podfile`);

  console.log('Cleaning up...');
  await cleanPropertyListBackupsAsync(infoPlistPath);
  await spawnAsync('/bin/rm', ['-rf', tmpExponentDirectory]);

  return;
}
