// Copyright 2015-present 650 Industries. All rights reserved.
/**
 * @flow
 */

'use strict';

// Set EXPO_VIEW_DIR to universe/exponent to test locally

import 'instapromise';

import mkdirp from 'mkdirp';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import glob from 'glob';
import uuid from 'uuid';
import yesno from 'yesno';

import {
  isDirectory,
  parseSdkMajorVersion,
  saveImageToPathAsync,
  rimrafDontThrow,
} from './ExponentTools';

import * as IosPlist from './IosPlist';
import * as IosNSBundle from './IosNSBundle';
import * as IosWorkspace from './IosWorkspace';

import Api from '../Api';
import ErrorCode from '../ErrorCode';
import * as ProjectUtils from '../project/ProjectUtils';
import UserManager from '../User';
import XDLError from '../XDLError';
import StandaloneContext from './StandaloneContext';
import * as UrlUtils from '../UrlUtils';
import * as Utils from '../Utils';
import * as Versions from '../Versions';

const ANDROID_TEMPLATE_PKG = 'detach.app.template.pkg.name';
const ANDROID_TEMPLATE_COMPANY = 'detach.app.template.company.domain';
const ANDROID_TEMPLATE_NAME = 'DetachAppTemplate';

function yesnoAsync(question) {
  return new Promise(resolve => {
    yesno.ask(question, null, ok => {
      resolve(ok);
    });
  });
}

export async function detachAsync(projectRoot: string, options: any) {
  let user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error('Internal error -- somehow detach is being run in offline mode.');
  }

  let username = user.username;
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  let experienceName = `@${username}/${exp.slug}`;
  let experienceUrl = `exp://exp.host/${experienceName}`;

  // Check to make sure project isn't fully detached already
  let hasIosDirectory = isDirectory(path.join(projectRoot, 'ios'));
  let hasAndroidDirectory = isDirectory(path.join(projectRoot, 'android'));

  if (hasIosDirectory && hasAndroidDirectory) {
    throw new XDLError(
      ErrorCode.DIRECTORY_ALREADY_EXISTS,
      'Error detaching. `ios` and `android` directories already exist.'
    );
  }

  // Project was already detached on Windows or Linux
  if (!hasIosDirectory && hasAndroidDirectory && process.platform === 'darwin') {
    let response = await yesnoAsync(
      `This will add an Xcode project and leave your existing Android project alone. Enter 'yes' to continue:`
    );
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
    throw new Error(
      `${configName} is missing android.package field. See https://docs.expo.io/versions/latest/guides/configuration.html#package`
    );
  }

  if (!exp.sdkVersion) {
    throw new Error(`${configName} is missing \`sdkVersion\``);
  }

  let majorSdkVersion = parseSdkMajorVersion(exp.sdkVersion);
  if (majorSdkVersion < 16) {
    throw new Error(`${configName} must be updated to SDK 16.0.0 or newer to be detached.`);
  }

  const versions = await Versions.versionsAsync();
  let sdkVersionConfig = versions.sdkVersions[exp.sdkVersion];
  if (
    !sdkVersionConfig ||
    !sdkVersionConfig.androidExpoViewUrl ||
    !sdkVersionConfig.iosExpoViewUrl
  ) {
    if (process.env.EXPO_VIEW_DIR) {
      console.warn(
        `Detaching is not supported for SDK ${exp.sdkVersion}; ignoring this because you provided EXPO_VIEW_DIR`
      );
      sdkVersionConfig = {};
    } else {
      throw new Error(`Detaching is not supported for SDK version ${exp.sdkVersion}`);
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
  let isIosSupported = true;
  if (process.platform !== 'darwin') {
    if (options && options.force) {
      console.warn(
        `You are not running macOS, but have provided the --force option, so we will attempt to generate an iOS project anyway. This might fail.`
      );
    } else {
      console.warn(`Skipping iOS because you are not running macOS.`);
      isIosSupported = false;
    }
  }
  if (!hasIosDirectory && isIosSupported) {
    const context = StandaloneContext.createUserContext(projectRoot, exp, experienceUrl);
    await detachIOSAsync(context);
    exp = IosWorkspace.addDetachedConfigToExp(exp, context);
    exp.detach.iosExpoViewUrl = sdkVersionConfig.iosExpoViewUrl;
  }

  // Android
  if (!hasAndroidDirectory) {
    let androidDirectory = path.join(expoDirectory, 'android');
    rimraf.sync(androidDirectory);
    mkdirp.sync(androidDirectory);
    await detachAndroidAsync(
      projectRoot,
      androidDirectory,
      exp.sdkVersion,
      experienceUrl,
      exp,
      sdkVersionConfig.androidExpoViewUrl
    );
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

  console.log(
    'Finished detaching your project! Look in the `android` and `ios` directories for the respective native projects. Follow the ExpoKit guide at https://docs.expo.io/versions/latest/guides/expokit.html to get your project running.\n'
  );
  return true;
}

/**
 *  Create a detached Expo iOS app pointing at the given project.
 */
async function detachIOSAsync(context: StandaloneContext) {
  await IosWorkspace.createDetachedAsync(context);

  console.log('Configuring iOS project...');
  await IosNSBundle.configureAsync(context);

  console.log(`iOS detach is complete!`);
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

async function detachAndroidAsync(
  projectRoot,
  expoDirectory,
  sdkVersion,
  experienceUrl,
  manifest,
  expoViewUrl: string
) {
  let tmpExpoDirectory;
  if (process.env.EXPO_VIEW_DIR) {
    // Only for testing
    tmpExpoDirectory = process.env.EXPO_VIEW_DIR;
  } else {
    tmpExpoDirectory = path.join(projectRoot, 'temp-android-directory');
    mkdirp.sync(tmpExpoDirectory);
    console.log('Downloading Android code...');
    await Api.downloadAsync(expoViewUrl, tmpExpoDirectory, { extract: true });
  }

  let androidProjectDirectory = path.join(projectRoot, 'android');

  console.log('Moving Android project files...');

  await Utils.ncpAsync(
    path.join(tmpExpoDirectory, 'android', 'maven'),
    path.join(expoDirectory, 'maven')
  );
  await Utils.ncpAsync(
    path.join(tmpExpoDirectory, 'android', 'detach-scripts'),
    path.join(expoDirectory, 'detach-scripts')
  );
  await Utils.ncpAsync(
    path.join(tmpExpoDirectory, 'exponent-view-template', 'android'),
    androidProjectDirectory
  );
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
  let androidManifest = path.join(
    androidProjectDirectory,
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  await regexFileAsync(androidManifest, 'PLACEHOLDER_DETACH_SCHEME', manifest.detach.scheme);

  // Fix MainActivity
  let mainActivity = path.join(
    androidProjectDirectory,
    'app',
    'src',
    'main',
    'java',
    'detach',
    'app',
    'template',
    'pkg',
    'name',
    'MainActivity.java'
  );
  await regexFileAsync(mainActivity, 'TEMPLATE_INITIAL_URL', experienceUrl);

  // Fix package name
  let packageName = manifest.android.package;
  await renamePackageAsync(
    path.join(androidProjectDirectory, 'app', 'src', 'main', 'java'),
    ANDROID_TEMPLATE_PKG,
    packageName
  );
  await renamePackageAsync(
    path.join(androidProjectDirectory, 'app', 'src', 'test', 'java'),
    ANDROID_TEMPLATE_PKG,
    packageName
  );
  await renamePackageAsync(
    path.join(androidProjectDirectory, 'app', 'src', 'androidTest', 'java'),
    ANDROID_TEMPLATE_PKG,
    packageName
  );

  let packageNameMatches = await glob.promise(androidProjectDirectory + '/**/*.@(java|gradle|xml)');
  if (packageNameMatches) {
    let oldPkgRegex = new RegExp(`${ANDROID_TEMPLATE_PKG.replace(/\./g, '\\.')}`, 'g');
    for (let i = 0; i < packageNameMatches.length; i++) {
      await regexFileAsync(packageNameMatches[i], oldPkgRegex, packageName);
    }
  }

  // Fix app name
  console.log('Naming Android project...');
  let appName = manifest.name;
  await regexFileAsync(
    path.resolve(androidProjectDirectory, 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
    ANDROID_TEMPLATE_NAME,
    appName
  );

  // Fix image
  let icon = manifest.android && manifest.android.icon ? manifest.android.icon : manifest.icon;
  if (icon) {
    let iconMatches = await glob.promise(
      path.join(androidProjectDirectory, 'app', 'src', 'main', 'res') + '/**/ic_launcher.png'
    );
    if (iconMatches) {
      for (let i = 0; i < iconMatches.length; i++) {
        await fs.promise.unlink(iconMatches[i]);
        // TODO: make more efficient
        await saveImageToPathAsync(projectRoot, icon, iconMatches[i]);
      }
    }
  }

  // Clean up
  console.log('Cleaning up Android...');
  if (!process.env.EXPO_VIEW_DIR) {
    rimrafDontThrow(tmpExpoDirectory);
  }
  console.log('Android detach is complete!\n');
}

async function ensureBuildConstantsExistsIOSAsync(configFilePath: string) {
  // EXBuildConstants is included in newer ExpoKit projects.
  // create it if it doesn't exist.
  const doesBuildConstantsExist = fs.existsSync(
    path.join(configFilePath, 'EXBuildConstants.plist')
  );
  if (!doesBuildConstantsExist) {
    await IosPlist.createBlankAsync(configFilePath, 'EXBuildConstants');
    console.log('Created `EXBuildConstants.plist` because it did not exist yet');
  }
  return;
}

async function prepareDetachedBuildIosAsync(projectDir: string, exp: any, args: any) {
  const context = StandaloneContext.createUserContext(projectDir, exp);
  let { iosProjectDirectory, supportingDirectory } = IosWorkspace.getPaths(context);

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
  // insert expo development url into iOS config
  if (!args.skipXcodeConfig) {
    // populate EXPO_RUNTIME_VERSION from ExpoKit pod version
    let expoKitVersion = '';
    const podfileLockPath = path.join(iosProjectDirectory, 'Podfile.lock');
    try {
      const podfileLock = await fs.promise.readFile(podfileLockPath, 'utf8');
      const expoKitVersionRegex = /ExpoKit\/Core\W?\(([0-9\.]+)\)/gi;
      let match = expoKitVersionRegex.exec(podfileLock);
      expoKitVersion = match[1];
    } catch (e) {
      throw new Error(
        `Unable to read ExpoKit version from Podfile.lock. Make sure your project depends on ExpoKit. (${e})`
      );
    }

    // populate development url
    let devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);

    await ensureBuildConstantsExistsIOSAsync(supportingDirectory);
    await IosPlist.modifyAsync(supportingDirectory, 'EXBuildConstants', constantsConfig => {
      constantsConfig.developmentUrl = devUrl;
      constantsConfig.EXPO_RUNTIME_VERSION = expoKitVersion;
      return constantsConfig;
    });
  }
}

export async function prepareDetachedBuildAsync(projectDir: string, args: any) {
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  if (args.platform === 'ios') {
    await prepareDetachedBuildIosAsync(projectDir, exp, args);
  } else {
    let androidProjectDirectory = path.join(projectDir, 'android');
    let expoBuildConstantsMatches = await glob.promise(
      androidProjectDirectory + '/**/ExponentBuildConstants.java'
    );
    if (expoBuildConstantsMatches && expoBuildConstantsMatches.length) {
      let expoBuildConstants = expoBuildConstantsMatches[0];
      let devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);
      await regexFileAsync(
        expoBuildConstants,
        /DEVELOPMENT_URL \= \"[^\"]*\"\;/,
        `DEVELOPMENT_URL = "${devUrl}";`
      );
    }
  }
}
