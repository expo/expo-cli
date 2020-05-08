// Set EXPO_VIEW_DIR to universe/exponent to test locally

import fs from 'fs-extra';
import JsonFile from '@expo/json-file';
import path from 'path';
import process from 'process';
import rimraf from 'rimraf';
import glob from 'glob-promise';
import uuid from 'uuid';
import inquirer from 'inquirer';
import spawnAsync from '@expo/spawn-async';
import { findConfigFile, getConfig } from '@expo/config';
import isPlainObject from 'lodash/isPlainObject';

import { isDirectory, regexFileAsync, rimrafDontThrow } from './ExponentTools';

import * as AssetBundle from './AssetBundle';
import * as IosPlist from './IosPlist';
import * as IosNSBundle from './IosNSBundle';
import * as IosWorkspace from './IosWorkspace';
import * as AndroidShellApp from './AndroidShellApp';

import Api from '../Api';
import * as EmbeddedAssets from '../EmbeddedAssets';
import UserManager from '../User';
import XDLError from '../XDLError';
import StandaloneBuildFlags from './StandaloneBuildFlags';
import StandaloneContext from './StandaloneContext';
import * as UrlUtils from '../UrlUtils';
import * as Versions from '../Versions';
import installPackagesAsync from './installPackagesAsync';
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

export async function detachAsync(projectRoot, options = {}) {
  let originalLogger = logger.loggerObj;
  logger.configure({
    trace: options.verbose ? console.trace.bind(console) : () => {},
    debug: options.verbose ? console.debug.bind(console) : () => {},
    info: options.verbose ? console.info.bind(console) : () => {},
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    fatal: console.error.bind(console),
  });
  try {
    return await _detachAsync(projectRoot, options);
  } finally {
    logger.configure(originalLogger);
  }
}

async function _detachAsync(projectRoot, options) {
  let user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error('Internal error -- somehow detach is being run in offline mode.');
  }

  let username = user.username;
  const { configName, configPath, configNamespace } = findConfigFile(projectRoot);
  let { exp } = getConfig(projectRoot);
  let experienceName = `@${username}/${exp.slug}`;
  let experienceUrl = `exp://exp.host/${experienceName}`;

  // Check to make sure project isn't fully detached already
  let hasIosDirectory = isDirectory(path.join(projectRoot, 'ios'));
  let hasAndroidDirectory = isDirectory(path.join(projectRoot, 'android'));

  if (hasIosDirectory && hasAndroidDirectory) {
    throw new XDLError(
      'DIRECTORY_ALREADY_EXISTS',
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

  if (!Versions.gteSdkVersion(exp, '25.0.0')) {
    throw new Error(
      `The app must be updated to SDK 25.0.0 or newer to be compatible with this tool.`
    );
  }

  const versions = await Versions.versionsAsync();
  let sdkVersionConfig = versions.sdkVersions[exp.sdkVersion];
  if (
    !sdkVersionConfig ||
    (!sdkVersionConfig.androidExpoViewUrl && !sdkVersionConfig.iosExpoViewUrl)
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

  exp.isDetached = true;

  if (!exp.detach) {
    exp.detach = {};
  }

  let detachedUUID = uuid.v4().replace(/-/g, '');
  let generatedScheme = `exp${detachedUUID}`;

  if (!exp.detach.scheme && !Versions.gteSdkVersion(exp, '27.0.0')) {
    // set this for legacy purposes
    exp.detach.scheme = generatedScheme;
  }

  if (!exp.scheme) {
    logger.info(
      `You have not specified a custom scheme for deep linking. A default value of ${generatedScheme} will be used. You can change this later by following the instructions in this guide: https://docs.expo.io/workflow/linking/`
    );
    exp.scheme = generatedScheme;
  }

  let expoDirectory = path.join(projectRoot, '.expo-source');
  fs.mkdirpSync(expoDirectory);
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

  if (!hasIosDirectory && isIosSupported && sdkVersionConfig.iosExpoViewUrl) {
    if (!exp.ios) {
      exp.ios = {};
    }
    if (!exp.ios.bundleIdentifier) {
      logger.info(
        `You'll need to specify an iOS bundle identifier. See: https://docs.expo.io/workflow/configuration/#ios`
      );
      const { iosBundleIdentifier } = await inquirer.prompt([
        {
          name: 'iosBundleIdentifier',
          message: 'What would you like your iOS bundle identifier to be?',
          validate: value => /^[a-zA-Z][a-zA-Z0-9\-.]+$/.test(value),
        },
      ]);
      exp.ios.bundleIdentifier = iosBundleIdentifier;
    }

    await detachIOSAsync(context);
    exp = IosWorkspace.addDetachedConfigToExp(exp, context);
    exp.detach.iosExpoViewUrl = sdkVersionConfig.iosExpoViewUrl;
  }

  // Android
  if (!hasAndroidDirectory && sdkVersionConfig.androidExpoViewUrl) {
    if (!exp.android) {
      exp.android = {};
    }
    if (!exp.android.package) {
      logger.info(
        `You'll need to specify an Android package name. See: https://docs.expo.io/workflow/configuration/#android`
      );
      const { androidPackage } = await inquirer.prompt([
        {
          name: 'androidPackage',
          message: 'What would you like your Android package name to be?',
          validate: value =>
            /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(value)
              ? true
              : "Invalid format of Android package name (only alphanumeric characters, '.' and '_' are allowed, and each '.' must be followed by a letter)",
        },
      ]);
      exp.android.package = androidPackage;
    }

    let androidDirectory = path.join(expoDirectory, 'android');
    rimraf.sync(androidDirectory);
    fs.mkdirpSync(androidDirectory);
    await detachAndroidAsync(context, sdkVersionConfig.androidExpoViewUrl);
    exp = AndroidShellApp.addDetachedConfigToExp(exp, context);
    exp.detach.androidExpoViewUrl = sdkVersionConfig.androidExpoViewUrl;
  }

  logger.info('Writing ExpoKit configuration...');
  // if we're writing to app.json, we need to place the configuration under the expo key
  const config = configNamespace ? { [configNamespace]: exp } : exp;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  const packagesToInstall = [];
  const nodeModulesPath = exp.nodeModulesPath
    ? path.resolve(projectRoot, exp.nodeModulesPath)
    : projectRoot;

  if (sdkVersionConfig && sdkVersionConfig.expoReactNativeTag) {
    packagesToInstall.push(
      `react-native@https://github.com/expo/react-native/archive/${sdkVersionConfig.expoReactNativeTag}.tar.gz`
    );
  } else if (process.env.EXPO_VIEW_DIR) {
    // ignore, using test directory
  } else {
    throw new Error(`Expo's React Native fork does not support this SDK version.`);
  }

  // Add expokitNpmPackage if it is supported. Was added before SDK 29.
  if (process.env.EXPO_VIEW_DIR) {
    logger.info(`Linking 'expokit' package...`);
    await spawnAsync('yarn', ['link'], {
      cwd: path.join(process.env.EXPO_VIEW_DIR, 'expokit-npm-package'),
    });
    await spawnAsync('yarn', ['link', 'expokit'], {
      cwd: nodeModulesPath,
    });
  } else if (sdkVersionConfig.expokitNpmPackage) {
    packagesToInstall.push(sdkVersionConfig.expokitNpmPackage);
  }

  if (sdkVersionConfig) {
    const { packagesToInstallWhenEjecting } = sdkVersionConfig;
    if (isPlainObject(packagesToInstallWhenEjecting)) {
      Object.keys(packagesToInstallWhenEjecting).forEach(packageName => {
        packagesToInstall.push(`${packageName}@${packagesToInstallWhenEjecting[packageName]}`);
      });
    }
  }

  if (packagesToInstall.length) {
    await installPackagesAsync(projectRoot, packagesToInstall, {
      packageManager: options.packageManager,
    });
  }
  return true;
}

/**
 *  Create a detached Expo iOS app pointing at the given project.
 */
async function detachIOSAsync(context) {
  await IosWorkspace.createDetachedAsync(context);

  logger.info('Configuring iOS project...');
  await IosNSBundle.configureAsync(context);

  logger.info(`iOS detach is complete!`);
}

async function detachAndroidAsync(context, expoViewUrl) {
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
      true,
      context.data.exp.sdkVersion
    );
  } else {
    tmpExpoDirectory = path.join(context.data.projectPath, 'temp-android-directory');
    fs.mkdirpSync(tmpExpoDirectory);
    logger.info('Downloading Android code...');
    await Api.downloadAsync(expoViewUrl, tmpExpoDirectory, { extract: true });
    await AndroidShellApp.copyInitialShellAppFilesAsync(
      tmpExpoDirectory,
      androidProjectDirectory,
      true,
      context.data.exp.sdkVersion
    );
  }

  logger.info('Updating Android app...');
  await AndroidShellApp.runShellAppModificationsAsync(context, context.data.exp.sdkVersion);

  // Clean up
  logger.info('Cleaning up Android...');
  if (!process.env.EXPO_VIEW_DIR) {
    rimrafDontThrow(tmpExpoDirectory);
  }
  logger.info('Android detach is complete!\n');
}

async function ensureBuildConstantsExistsIOSAsync(configFilePath) {
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

async function _getIosExpoKitVersionThrowErrorAsync(iosProjectDirectory) {
  let expoKitVersion = '';
  const podfileLockPath = path.join(iosProjectDirectory, 'Podfile.lock');
  try {
    const podfileLock = await fs.readFile(podfileLockPath, 'utf8');
    const expoKitVersionRegex = /ExpoKit\/Core\W?\(([0-9.]+)\)/gi;
    let match = expoKitVersionRegex.exec(podfileLock);
    expoKitVersion = match[1];
  } catch (e) {
    throw new Error(
      `Unable to read ExpoKit version from Podfile.lock. Make sure your project depends on ExpoKit. (${e})`
    );
  }
  return expoKitVersion;
}

async function readNullableConfigJsonAsync(projectDir) {
  try {
    return getConfig(projectDir);
  } catch (_) {
    return null;
  }
}

async function prepareDetachedBuildIosAsync(projectDir, args) {
  const config = await readNullableConfigJsonAsync(projectDir);
  if (config) {
    return prepareDetachedUserContextIosAsync(projectDir, config.exp, args);
  } else {
    return prepareDetachedServiceContextIosAsync(projectDir, args);
  }
}

async function prepareDetachedServiceContextIosAsync(projectDir, args) {
  // service context
  // TODO: very brittle hack: the paths here are hard coded to match the single workspace
  // path generated inside IosShellApp. When we support more than one path, this needs to
  // be smarter.
  const expoRootDir = path.join(projectDir, '..', '..');
  const workspaceSourcePath = path.join(projectDir, 'ios');
  const buildFlags = StandaloneBuildFlags.createIos('Release', { workspaceSourcePath });
  const context = StandaloneContext.createServiceContext(
    expoRootDir,
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

  const { exp } = getConfig(expoRootDir, { skipSDKVersionRequirement: true });

  await IosPlist.modifyAsync(supportingDirectory, 'EXBuildConstants', constantsConfig => {
    // verify that we are actually in a service context and not a misconfigured project
    const contextType = constantsConfig.STANDALONE_CONTEXT_TYPE;
    if (contextType !== 'service') {
      throw new Error(
        'Unable to configure a project which has no app.json and also no STANDALONE_CONTEXT_TYPE.'
      );
    }
    constantsConfig.EXPO_RUNTIME_VERSION = expoKitVersion;
    constantsConfig.API_SERVER_ENDPOINT =
      process.env.ENVIRONMENT === 'staging'
        ? 'https://staging.exp.host/--/api/v2/'
        : 'https://exp.host/--/api/v2/';
    if (prodApiKeys) {
      constantsConfig.DEFAULT_API_KEYS = prodApiKeys;
    }
    if (exp && exp.sdkVersion) {
      constantsConfig.TEMPORARY_SDK_VERSION = exp.sdkVersion;
    }
    return constantsConfig;
  });
}

async function _readDefaultApiKeysAsync(jsonFilePath) {
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

async function prepareDetachedUserContextIosAsync(projectDir, exp, args) {
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
      if (exp.sdkVersion) {
        constantsConfig.TEMPORARY_SDK_VERSION = exp.sdkVersion;
      }
      return constantsConfig;
    });
  }
}

export async function prepareDetachedBuildAsync(projectDir, args) {
  if (args.platform === 'ios') {
    await prepareDetachedBuildIosAsync(projectDir, args);
  } else {
    let androidProjectDirectory = path.join(projectDir, 'android');
    let expoBuildConstantsMatches = await glob(
      androidProjectDirectory + '/**/DetachBuildConstants.java'
    );
    if (expoBuildConstantsMatches && expoBuildConstantsMatches.length) {
      let expoBuildConstants = expoBuildConstantsMatches[0];
      let devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);
      await regexFileAsync(
        /DEVELOPMENT_URL = "[^"]*";/,
        `DEVELOPMENT_URL = "${devUrl}";`,
        expoBuildConstants
      );
    }
  }
}

// args.dest: string,
// This is the path where assets will be copied to. It should be
// `$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH` on iOS
// (see `exponent-view-template.xcodeproj/project.pbxproj` for an example)
// and `$buildDir/intermediates/assets/$targetPath` on Android (see
// `android/app/expo.gradle` for an example).
export async function bundleAssetsAsync(projectDir, args) {
  const options = await readNullableConfigJsonAsync(projectDir);
  if (!options) {
    // Don't run assets bundling for the service context.
    return;
  }
  const { exp } = options;
  let bundledManifestPath = EmbeddedAssets.getEmbeddedManifestPath(args.platform, projectDir, exp);
  if (!bundledManifestPath) {
    logger.warn(
      `Skipped assets bundling because the '${args.platform}.publishManifestPath' key is not specified in the app manifest.`
    );
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(bundledManifestPath, 'utf8'));
  } catch (ex) {
    throw new Error(
      `Error reading the manifest file. Make sure the path '${bundledManifestPath}' is correct.\n\nError: ${ex.message}`
    );
  }
  if (!manifest || !Object.keys(manifest).length) {
    throw new Error(`The manifest at '${bundledManifestPath}' was empty or invalid.`);
  }

  await AssetBundle.bundleAsync(null, manifest.bundledAssets, args.dest, getExportUrl(manifest));
}

/**
 * This function extracts the exported public URL that is set in the manifest
 * when the developer runs `expo export --public-url x`. We use this to ensure
 * that we fetch the resources from the appropriate place when doing builds
 * against self-hosted apps.
 */
function getExportUrl(manifest) {
  const { bundleUrl } = manifest;
  if (bundleUrl.includes(AssetBundle.DEFAULT_CDN_HOST)) {
    return null;
  }

  try {
    const bundleUrlParts = bundleUrl.split('/');
    return bundleUrlParts.slice(0, bundleUrlParts.length - 2).join('/');
  } catch (e) {
    throw Error(
      `Expected bundleUrl to be of the format https://domain/bundles/bundle-hash-id, ${bundleUrl} does not follow this format.`
    );
  }
}
