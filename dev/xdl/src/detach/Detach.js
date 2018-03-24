// Copyright 2015-present 650 Industries. All rights reserved.
/**
 * @flow
 */

'use strict';

// Set EXPO_VIEW_DIR to universe/exponent to test locally

import mkdirp from 'mkdirp';
import fs from 'fs-extra';
import JsonFile from '@expo/json-file';
import path from 'path';
import rimraf from 'rimraf';
import glob from 'glob-promise';
import uuid from 'uuid';
import chalk from 'chalk';
import inquirer from 'inquirer';

import {
  isDirectory,
  parseSdkMajorVersion,
  saveImageToPathAsync,
  rimrafDontThrow,
} from './ExponentTools';

import * as IosPlist from './IosPlist';
import * as IosNSBundle from './IosNSBundle';
import * as IosWorkspace from './IosWorkspace';
import * as AndroidShellApp from './AndroidShellApp';
import * as OldAndroidDetach from './OldAndroidDetach';

import Api from '../Api';
import ErrorCode from '../ErrorCode';
import * as ProjectUtils from '../project/ProjectUtils';
import UserManager from '../User';
import XDLError from '../XDLError';
import StandaloneBuildFlags from './StandaloneBuildFlags';
import StandaloneContext from './StandaloneContext';
import * as UrlUtils from '../UrlUtils';
import * as Utils from '../Utils';
import * as Versions from '../Versions';
import installPackageAsync from './installPackageAsync';
import logger from './Logger';

async function yesnoAsync(message) {
  const { ok } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message,
    },
  ]);
  return ok;
}

export async function detachAsync(projectRoot: string, options: any = {}) {
  let user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error('Internal error -- somehow detach is being run in offline mode.');
  }

  let username = user.username;
  const { configName, configPath, configNamespace } = await ProjectUtils.findConfigFileAsync(
    projectRoot
  );
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  if (!exp) throw new Error(`Couldn't read ${configName}`);
  if (!pkg) throw new Error(`Couldn't read package.json`);
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
      logger.info('Exiting...');
      return false;
    }
  }

  if (hasIosDirectory && !hasAndroidDirectory) {
    throw new Error('`ios` directory already exists. Please remove it and try again.');
  }

  logger.info('Validating project manifest...');
  if (!exp.name) {
    throw new Error(`${configName} is missing \`name\``);
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
      logger.warn(
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
  const context = StandaloneContext.createUserContext(projectRoot, exp, experienceUrl);

  // iOS
  let isIosSupported = true;
  if (process.platform !== 'darwin') {
    if (options && options.force) {
      logger.warn(
        `You are not running macOS, but have provided the --force option, so we will attempt to generate an iOS project anyway. This might fail.`
      );
    } else {
      logger.warn(`Skipping iOS because you are not running macOS.`);
      isIosSupported = false;
    }
  }

  if (!hasIosDirectory && isIosSupported) {
    if (!exp.ios) {
      exp.ios = {};
    }
    if (!exp.ios.bundleIdentifier) {
      logger.info(
        `You'll need to specify an iOS bundle identifier. See: https://docs.expo.io/versions/latest/guides/configuration.html#bundleidentifier`
      );
      const { iosBundleIdentifier } = await inquirer.prompt([
        {
          name: 'iosBundleIdentifier',
          message: 'What would you like your iOS bundle identifier to be?',
          validate: value => /^[a-zA-Z][a-zA-Z0-9\-\.]+$/.test(value),
        },
      ]);
      exp.ios.bundleIdentifier = iosBundleIdentifier;
    }

    await detachIOSAsync(context);
    exp = IosWorkspace.addDetachedConfigToExp(exp, context);
    exp.detach.iosExpoViewUrl = sdkVersionConfig.iosExpoViewUrl;
  }

  // Android
  if (!hasAndroidDirectory) {
    if (!exp.android) {
      exp.android = {};
    }
    if (!exp.android.package) {
      logger.info(
        `You'll need to specify an Android package name. See: https://docs.expo.io/versions/latest/guides/configuration.html#package`
      );
      const { androidPackage } = await inquirer.prompt([
        {
          name: 'androidPackage',
          message: 'What would you like your Android package name to be?',
          validate: value => /^[a-zA-Z][a-zA-Z0-9\_\.]+$/.test(value),
        },
      ]);
      exp.android.package = androidPackage;
    }

    let androidDirectory = path.join(expoDirectory, 'android');
    rimraf.sync(androidDirectory);
    mkdirp.sync(androidDirectory);
    if (Versions.gteSdkVersion(exp, '24.0.0')) {
      await detachAndroidAsync(context, sdkVersionConfig.androidExpoViewUrl);
    } else {
      await OldAndroidDetach.detachAndroidAsync(
        projectRoot,
        androidDirectory,
        exp.sdkVersion,
        experienceUrl,
        exp,
        sdkVersionConfig.androidExpoViewUrl
      );
    }
    exp.detach.androidExpoViewUrl = sdkVersionConfig.androidExpoViewUrl;
  }

  logger.info('Writing ExpoKit configuration...');
  // Update exp.json/app.json
  // if we're writing to app.json, we need to place the configuration under the expo key
  const config = configNamespace ? { [configNamespace]: exp } : exp;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  let reactNativeVersion, expoReactNativeTag;
  if (sdkVersionConfig && sdkVersionConfig.expoReactNativeTag) {
    expoReactNativeTag = sdkVersionConfig.expoReactNativeTag;
    reactNativeVersion = `https://github.com/expo/react-native/archive/${expoReactNativeTag}.tar.gz`;
  } else {
    if (process.env.EXPO_VIEW_DIR) {
      // ignore, using test directory
    } else {
      throw new Error(`Expo's React Native fork does not support this SDK version.`);
    }
  }
  if (reactNativeVersion && pkg.dependencies['react-native'] !== reactNativeVersion) {
    logger.info('Installing the Expo fork of react-native...');
    const nodeModulesPath = exp.nodeModulesPath
      ? path.resolve(projectRoot, exp.nodeModulesPath)
      : projectRoot;
    try {
      await installPackageAsync(nodeModulesPath, 'react-native', reactNativeVersion, {
        silent: true,
      });
    } catch (e) {
      logger.warn('Unable to install the Expo fork of react-native.');
      logger.warn(`Please install react-native@${reactNativeVersion} to complete detaching.`);
      throw e;
    }
  }

  logger.info(
    'Finished detaching your project! Look in the `android` and `ios` directories for the respective native projects. Follow the ExpoKit guide at https://docs.expo.io/versions/latest/guides/expokit.html to get your project running.'
  );
  return true;
}

/**
 *  Create a detached Expo iOS app pointing at the given project.
 */
async function detachIOSAsync(context: StandaloneContext) {
  await IosWorkspace.createDetachedAsync(context);

  logger.info('Configuring iOS project...');
  await IosNSBundle.configureAsync(context);

  logger.info(`iOS detach is complete!`);
}

async function regexFileAsync(filename, regex, replace) {
  let file = await fs.readFile(filename);
  let fileString = file.toString();
  await fs.writeFile(filename, fileString.replace(regex, replace));
}

async function detachAndroidAsync(context: StandaloneContext, expoViewUrl: string) {
  if (context.type !== 'user') {
    throw new Error(`detachAndroidAsync only supports user standalone contexts`);
  }

  logger.info('Moving Android project files...');
  let androidProjectDirectory = path.join(context.data.projectPath, 'android');
  let tmpExpoDirectory;
  if (process.env.EXPO_VIEW_DIR) {
    // Only for testing
    await AndroidShellApp.copyInitialShellAppFilesAsync(
      path.join(process.env.EXPO_VIEW_DIR, 'android'),
      androidProjectDirectory,
      true
    );
  } else {
    tmpExpoDirectory = path.join(context.data.projectPath, 'temp-android-directory');
    mkdirp.sync(tmpExpoDirectory);
    logger.info('Downloading Android code...');
    await Api.downloadAsync(expoViewUrl, tmpExpoDirectory, { extract: true });
    await AndroidShellApp.copyInitialShellAppFilesAsync(
      tmpExpoDirectory,
      androidProjectDirectory,
      true
    );
  }

  logger.info('Updating Android app...');
  await AndroidShellApp.runShellAppModificationsAsync(context, true);

  // Clean up
  logger.info('Cleaning up Android...');
  if (!process.env.EXPO_VIEW_DIR) {
    rimrafDontThrow(tmpExpoDirectory);
  }
  logger.info('Android detach is complete!\n');
}

async function ensureBuildConstantsExistsIOSAsync(configFilePath: string) {
  // EXBuildConstants is included in newer ExpoKit projects.
  // create it if it doesn't exist.
  const doesBuildConstantsExist = fs.existsSync(
    path.join(configFilePath, 'EXBuildConstants.plist')
  );
  if (!doesBuildConstantsExist) {
    await IosPlist.createBlankAsync(configFilePath, 'EXBuildConstants');
    logger.info('Created `EXBuildConstants.plist` because it did not exist yet');
  }
}

async function _getIosExpoKitVersionThrowErrorAsync(iosProjectDirectory: string) {
  let expoKitVersion = '';
  const podfileLockPath = path.join(iosProjectDirectory, 'Podfile.lock');
  try {
    const podfileLock = await fs.readFile(podfileLockPath, 'utf8');
    const expoKitVersionRegex = /ExpoKit\/Core\W?\(([0-9\.]+)\)/gi;
    let match = expoKitVersionRegex.exec(podfileLock);
    expoKitVersion = match[1];
  } catch (e) {
    throw new Error(
      `Unable to read ExpoKit version from Podfile.lock. Make sure your project depends on ExpoKit. (${e})`
    );
  }
  return expoKitVersion;
}

async function prepareDetachedBuildIosAsync(projectDir: string, args: any) {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp) {
    return prepareDetachedUserContextIosAsync(projectDir, exp, args);
  } else {
    return prepareDetachedServiceContextIosAsync(projectDir, args);
  }
}

async function prepareDetachedServiceContextIosAsync(projectDir: string, args: any) {
  // service context
  // TODO: very brittle hack: the paths here are hard coded to match the single workspace
  // path generated inside IosShellApp. When we support more than one path, this needs to
  // be smarter.
  const workspaceSourcePath = path.join(projectDir, 'default');
  const buildFlags = StandaloneBuildFlags.createIos('Release', { workspaceSourcePath });
  const context = StandaloneContext.createServiceContext(
    path.join(projectDir, '..', '..'),
    null,
    null,
    null,
    /* testEnvironment */ 'none',
    buildFlags,
    null,
    null
  );
  const { iosProjectDirectory, supportingDirectory } = IosWorkspace.getPaths(context);
  const expoKitVersion = await _getIosExpoKitVersionThrowErrorAsync(iosProjectDirectory);

  // use prod api keys if available
  const prodApiKeys = await _readDefaultApiKeysAsync(
    path.join(context.data.expoSourcePath, '__internal__', 'keys.json')
  );

  await IosPlist.modifyAsync(supportingDirectory, 'EXBuildConstants', constantsConfig => {
    // verify that we are actually in a service context and not a misconfigured project
    const contextType = constantsConfig.STANDALONE_CONTEXT_TYPE;
    if (contextType !== 'service') {
      throw new Error(
        'Unable to configure a project which has no app.json and also no STANDALONE_CONTEXT_TYPE.'
      );
    }
    constantsConfig.EXPO_RUNTIME_VERSION = expoKitVersion;
    if (prodApiKeys) {
      constantsConfig.DEFAULT_API_KEYS = prodApiKeys;
    }
    return constantsConfig;
  });
  return;
}

async function _readDefaultApiKeysAsync(jsonFilePath: string) {
  if (fs.existsSync(jsonFilePath)) {
    let keys = {};
    const allKeys = await new JsonFile(jsonFilePath).readAsync();
    const validKeys = ['AMPLITUDE_KEY', 'GOOGLE_MAPS_IOS_API_KEY'];
    for (const key in allKeys) {
      if (allKeys.hasOwnProperty(key) && validKeys.includes(key)) {
        keys[key] = allKeys[key];
      }
    }
    return keys;
  }
  return null;
}

async function prepareDetachedUserContextIosAsync(projectDir: string, exp: any, args: any) {
  const context = StandaloneContext.createUserContext(projectDir, exp);
  let { iosProjectDirectory, supportingDirectory } = IosWorkspace.getPaths(context);

  logger.info(`Preparing iOS build at ${iosProjectDirectory}...`);
  // These files cause @providesModule naming collisions
  // but are not available until after `pod install` has run.
  let podsDirectory = path.join(iosProjectDirectory, 'Pods');
  if (!isDirectory(podsDirectory)) {
    throw new Error(`Can't find directory ${podsDirectory}, make sure you've run pod install.`);
  }
  let rnPodDirectory = path.join(podsDirectory, 'React');
  if (isDirectory(rnPodDirectory)) {
    let rnFilesToDelete = await glob(rnPodDirectory + '/**/*.@(js|json)');
    if (rnFilesToDelete) {
      for (let i = 0; i < rnFilesToDelete.length; i++) {
        await fs.unlink(rnFilesToDelete[i]);
      }
    }
  }
  // insert expo development url into iOS config
  if (!args.skipXcodeConfig) {
    // populate EXPO_RUNTIME_VERSION from ExpoKit pod version
    const expoKitVersion = await _getIosExpoKitVersionThrowErrorAsync(iosProjectDirectory);

    // populate development url
    let devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);

    // populate default api keys
    const defaultApiKeys = await _readDefaultApiKeysAsync(
      path.join(podsDirectory, 'ExpoKit', 'template-files', 'keys.json')
    );

    await ensureBuildConstantsExistsIOSAsync(supportingDirectory);
    await IosPlist.modifyAsync(supportingDirectory, 'EXBuildConstants', constantsConfig => {
      constantsConfig.developmentUrl = devUrl;
      constantsConfig.EXPO_RUNTIME_VERSION = expoKitVersion;
      if (defaultApiKeys) {
        constantsConfig.DEFAULT_API_KEYS = defaultApiKeys;
      }
      return constantsConfig;
    });
  }
}

export async function prepareDetachedBuildAsync(projectDir: string, args: any) {
  if (args.platform === 'ios') {
    await prepareDetachedBuildIosAsync(projectDir, args);
  } else {
    let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
    let buildConstantsFileName = Versions.gteSdkVersion(exp, '24.0.0')
      ? 'DetachBuildConstants.java'
      : 'ExponentBuildConstants.java';

    let androidProjectDirectory = path.join(projectDir, 'android');
    let expoBuildConstantsMatches = await glob(
      androidProjectDirectory + '/**/' + buildConstantsFileName
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
