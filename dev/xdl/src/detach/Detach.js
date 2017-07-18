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
  createBlankIOSPropertyListAsync,
  parseSdkMajorVersion,
  saveIconToPathAsync,
  spawnAsyncThrowError,
  spawnAsync,
  transformFileContentsAsync,
  modifyIOSPropertyListAsync,
  cleanIOSPropertyListBackupAsync,
  configureIOSIconsAsync,
} from './ExponentTools';
import {
  configureStandaloneIOSInfoPlistAsync,
  configureStandaloneIOSShellPlistAsync,
} from './IosShellApp';
import { renderPodfileAsync } from './IosPodsTools.js';

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
  return new Promise(resolve => {
    yesno.ask(question, null, ok => {
      resolve(ok);
    });
  });
}

export async function detachAsync(projectRoot: string) {
  let user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error(
      'Internal error -- somehow detach is being run in offline mode.'
    );
  }

  let username = user.username;
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  let experienceName = `@${username}/${exp.slug}`;
  let experienceUrl = `exp://exp.host/${experienceName}`;

  // Check to make sure project isn't fully detached already
  let hasIosDirectory = _isDirectory(path.join(projectRoot, 'ios'));
  let hasAndroidDirectory = _isDirectory(path.join(projectRoot, 'android'));

  if (hasIosDirectory && hasAndroidDirectory) {
    throw new XDLError(
      ErrorCode.DIRECTORY_ALREADY_EXISTS,
      'Error detaching. `ios` and `android` directories already exist.'
    );
  }

  // Project was already detached on Windows or Linux
  if (
    !hasIosDirectory &&
    hasAndroidDirectory &&
    process.platform === 'darwin'
  ) {
    let response = await yesnoAsync(
      `This will add an Xcode project and leave your existing Android project alone. Enter 'yes' to continue:`
    );
    if (!response) {
      console.log('Exiting...');
      return false;
    }
  }

  if (hasIosDirectory && !hasAndroidDirectory) {
    throw new Error(
      '`ios` directory already exists. Please remove it and try again.'
    );
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
    throw new Error(
      `${configName} must be updated to SDK 16.0.0 or newer to be detached.`
    );
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
      throw new Error(
        `Detaching is not supported for SDK version ${exp.sdkVersion}`
      );
    }
  }

  if (process.platform !== 'darwin') {
    let response = await yesnoAsync(
      `Can't create an iOS project since you are not on macOS. You can rerun this command on macOS in the future to add an iOS project. Enter 'yes' to continue and just create an Android project:`
    );
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
    const iosClientVersion = sdkVersionConfig.iosVersion
      ? sdkVersionConfig.iosVersion
      : versions.iosVersion;
    await detachIOSAsync(
      projectRoot,
      exp.sdkVersion,
      experienceUrl,
      exp,
      sdkVersionConfig.iosExpoViewUrl,
      iosClientVersion
    );
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
  await fs.promise.writeFile(
    path.join(projectRoot, nameToWrite),
    JSON.stringify(exp, null, 2)
  );

  console.log(
    'Finished detaching your project! Look in the `android` and `ios` directories for the respective native projects. Follow the ExpoKit guide at https://docs.expo.io/versions/latest/guides/expokit.html to get your project running.\n'
  );
  return true;
}

function getIosPaths(projectRoot, manifest) {
  let iosProjectDirectory = path.join(projectRoot, 'ios');
  let projectName;
  if (manifest && manifest.name) {
    let projectNameLabel = manifest.name;
    projectName = projectNameLabel.replace(/[^a-z0-9_\-]/gi, '-').toLowerCase();
  } else {
    throw new Error(
      'Cannot configure an ExpoKit app with no name. Are you missing `exp.json`?'
    );
  }
  return {
    iosProjectDirectory,
    projectName,
  };
}

function rimrafDontThrow(directory) {
  try {
    rimraf.sync(directory);
  } catch (e) {
    console.warn(
      `There was an issue cleaning up, but your project should still work. You may need to manually remove ${directory}. (${e})`
    );
  }
}

async function configureDetachedVersionsPlistAsync(
  configFilePath,
  detachedSDKVersion,
  kernelSDKVersion
) {
  await modifyIOSPropertyListAsync(
    configFilePath,
    'EXSDKVersions',
    versionConfig => {
      versionConfig.sdkVersions = [detachedSDKVersion];
      versionConfig.detachedNativeVersions = {
        shell: detachedSDKVersion,
        kernel: kernelSDKVersion,
      };
      return versionConfig;
    }
  );
}

async function configureDetachedIOSInfoPlistAsync(configFilePath, manifest) {
  let result = await modifyIOSPropertyListAsync(
    configFilePath,
    'Info',
    config => {
      // add detached scheme
      if (manifest.isDetached && manifest.detach.scheme) {
        if (!config.CFBundleURLTypes) {
          config.CFBundleURLTypes = [
            {
              CFBundleURLSchemes: [],
            },
          ];
        }
        config.CFBundleURLTypes[0].CFBundleURLSchemes.push(
          manifest.detach.scheme
        );
      }
      if (config.UIDeviceFamily) {
        delete config.UIDeviceFamily;
      }
      return config;
    }
  );
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
export async function detachIOSAsync(
  projectRoot: string,
  sdkVersion: string,
  experienceUrl: string,
  manifest: any,
  templateProjUrl: string,
  iosClientVersion: string
) {
  let { iosProjectDirectory, projectName } = getIosPaths(projectRoot, manifest);

  let expoTemplateDirectory;
  if (process.env.EXPO_VIEW_DIR) {
    // Only for testing
    expoTemplateDirectory = process.env.EXPO_VIEW_DIR;
  } else {
    expoTemplateDirectory = path.join(projectRoot, 'temp-ios-directory');
    mkdirp.sync(expoTemplateDirectory);
    console.log('Downloading iOS code...');
    await Api.downloadAsync(templateProjUrl, expoTemplateDirectory, {
      extract: true,
    });
  }

  // copy downloaded template xcodeproj into the user's project.
  // HEY: if you need other paths into the extracted archive, be sure and include them
  // when the archive is generated in `ios/pipeline.js`
  console.log('Moving iOS project files...');
  await Utils.ncpAsync(
    path.join(expoTemplateDirectory, 'exponent-view-template', 'ios'),
    iosProjectDirectory
  );

  // rename the xcodeproj (and various other things) to the detached project name.
  console.log('Naming iOS project...');
  await _renameAndMoveIOSFilesAsync(iosProjectDirectory, projectName);

  // use the detached project manifest to configure corresponding native parts
  // of the detached xcodeproj. this is mostly the same configuration used for
  // shell apps.
  console.log('Configuring iOS project...');
  let infoPlistPath = `${iosProjectDirectory}/${projectName}/Supporting`;
  let iconPath = `${iosProjectDirectory}/${projectName}/Assets.xcassets/AppIcon.appiconset`;
  await configureStandaloneIOSInfoPlistAsync(infoPlistPath, manifest);
  let infoPlist = await configureDetachedIOSInfoPlistAsync(
    infoPlistPath,
    manifest
  );
  await configureStandaloneIOSShellPlistAsync(
    infoPlistPath,
    manifest,
    experienceUrl
  );
  // TODO: logic for when kernel sdk version is different from detached sdk version
  await configureDetachedVersionsPlistAsync(
    infoPlistPath,
    sdkVersion,
    sdkVersion
  );
  await configureIOSIconsAsync(manifest, iconPath, projectRoot);
  // we don't pre-cache JS in this case, TODO: think about whether that's correct

  // render Podfile in new project
  console.log('Configuring iOS dependencies...');

  let podfileSubstitutions = {
    TARGET_NAME: projectName,
    REACT_NATIVE_PATH: path.relative(
      iosProjectDirectory,
      path.join(projectRoot, 'node_modules', 'react-native')
    ),
    EXPOKIT_TAG: `ios/${iosClientVersion}`,
  };
  if (process.env.EXPOKIT_TAG_IOS) {
    console.log(`EXPOKIT_TAG_IOS: Using custom ExpoKit iOS tag...`);
    podfileSubstitutions.EXPOKIT_TAG = process.env.EXPOKIT_TAG_IOS;
  } else if (process.env.EXPO_VIEW_DIR) {
    console.log('EXPO_VIEW_DIR: Using local ExpoKit source for iOS...');
    podfileSubstitutions.EXPOKIT_PATH = path.relative(
      iosProjectDirectory,
      process.env.EXPO_VIEW_DIR
    );
  }
  await renderPodfileAsync(
    path.join(
      expoTemplateDirectory,
      'template-files',
      'ios',
      'ExpoKit-Podfile'
    ),
    path.join(iosProjectDirectory, 'Podfile'),
    podfileSubstitutions,
    sdkVersion
  );

  console.log('Cleaning up iOS...');
  await cleanPropertyListBackupsAsync(infoPlistPath);

  if (!process.env.EXPO_VIEW_DIR) {
    rimrafDontThrow(expoTemplateDirectory);
  }

  console.log(`iOS detach is complete!`);
  return;
}

async function _renameAndMoveIOSFilesAsync(projectDirectory, projectName) {
  const filesToTransform = [
    path.join('exponent-view-template.xcodeproj', 'project.pbxproj'),
    path.join('exponent-view-template.xcworkspace', 'contents.xcworkspacedata'),
    path.join(
      'exponent-view-template.xcodeproj',
      'xcshareddata',
      'xcschemes',
      'exponent-view-template.xcscheme'
    ),
  ];

  await Promise.all(
    filesToTransform.map(async fileName => {
      return transformFileContentsAsync(
        path.join(projectDirectory, fileName),
        fileString => {
          return fileString.replace(/exponent-view-template/g, projectName);
        }
      );
    })
  );

  // order of this array matters
  const filesToMove = [
    'exponent-view-template',
    path.join(
      'exponent-view-template.xcodeproj',
      'xcshareddata',
      'xcschemes',
      'exponent-view-template.xcscheme'
    ),
    'exponent-view-template.xcodeproj',
    'exponent-view-template.xcworkspace',
  ];

  filesToMove.forEach(async fileName => {
    let destFileName = path.join(
      path.dirname(fileName),
      `${projectName}${path.extname(fileName)}`
    );
    await spawnAsync('/bin/mv', [
      path.join(projectDirectory, fileName),
      path.join(projectDirectory, destFileName),
    ]);
  });

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
    originalDeepDirectory = path.join(
      originalDeepDirectory,
      originalSplitPackage[i]
    );
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
  let appBuildGradle = path.join(
    androidProjectDirectory,
    'app',
    'build.gradle'
  );
  await regexFileAsync(appBuildGradle, /\/\* UNCOMMENT WHEN DISTRIBUTING/g, '');
  await regexFileAsync(
    appBuildGradle,
    /END UNCOMMENT WHEN DISTRIBUTING \*\//g,
    ''
  );
  await regexFileAsync(appBuildGradle, `compile project(':expoview')`, '');

  // Fix AndroidManifest
  let androidManifest = path.join(
    androidProjectDirectory,
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  await regexFileAsync(
    androidManifest,
    'PLACEHOLDER_DETACH_SCHEME',
    manifest.detach.scheme
  );

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

  let packageNameMatches = await glob.promise(
    androidProjectDirectory + '/**/*.@(java|gradle|xml)'
  );
  if (packageNameMatches) {
    let oldPkgRegex = new RegExp(
      `${ANDROID_TEMPLATE_PKG.replace(/\./g, '\\.')}`,
      'g'
    );
    for (let i = 0; i < packageNameMatches.length; i++) {
      await regexFileAsync(packageNameMatches[i], oldPkgRegex, packageName);
    }
  }

  // Fix app name
  console.log('Naming Android project...');
  let appName = manifest.name;
  await regexFileAsync(
    path.resolve(
      androidProjectDirectory,
      'app',
      'src',
      'main',
      'res',
      'values',
      'strings.xml'
    ),
    ANDROID_TEMPLATE_NAME,
    appName
  );

  // Fix image
  let icon = manifest.android && manifest.android.icon
    ? manifest.android.icon
    : manifest.icon;
  if (icon) {
    let iconMatches = await glob.promise(
      path.join(androidProjectDirectory, 'app', 'src', 'main', 'res') +
        '/**/ic_launcher.png'
    );
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
    await createBlankIOSPropertyListAsync(configFilePath, 'EXBuildConstants');
    console.log(
      'Created `EXBuildConstants.plist` because it did not exist yet'
    );
  }
  return;
}

export async function prepareDetachedBuildAsync(projectDir: string, args: any) {
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  if (args.platform === 'ios') {
    let { iosProjectDirectory, projectName } = getIosPaths(projectDir, exp);

    console.log(`Preparing iOS build at ${iosProjectDirectory}...`);
    // These files cause @providesModule naming collisions
    // but are not available until after `pod install` has run.
    let podsDirectory = path.join(iosProjectDirectory, 'Pods');
    if (!_isDirectory(podsDirectory)) {
      throw new Error(
        `Can't find directory ${podsDirectory}, make sure you've run pod install.`
      );
    }
    let rnPodDirectory = path.join(podsDirectory, 'React');
    if (_isDirectory(rnPodDirectory)) {
      let rnFilesToDelete = await glob.promise(
        rnPodDirectory + '/**/*.@(js|json)'
      );
      if (rnFilesToDelete) {
        for (let i = 0; i < rnFilesToDelete.length; i++) {
          await fs.promise.unlink(rnFilesToDelete[i]);
        }
      }
    }
    // insert expo development url into iOS config
    if (!args.skipXcodeConfig) {
      let devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);
      let configFilePath = path.join(
        iosProjectDirectory,
        projectName,
        'Supporting'
      );

      await ensureBuildConstantsExistsIOSAsync(configFilePath);
      await modifyIOSPropertyListAsync(
        configFilePath,
        'EXBuildConstants',
        constantsConfig => {
          constantsConfig.developmentUrl = devUrl;
          return constantsConfig;
        }
      );
    }
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
