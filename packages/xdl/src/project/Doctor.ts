import {
  ExpoConfig,
  PackageJSONConfig,
  configFilename,
  fileExistsAsync,
  getConfig,
  getPackageJson,
  resolveModule,
} from '@expo/config';
import Schemer, { SchemerError, ValidationError } from '@expo/schemer';
import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import getenv from 'getenv';
import _ from 'lodash';
import path from 'path';
import semver from 'semver';

import Config from '../Config';
import * as Versions from '../Versions';
import * as Watchman from '../Watchman';
import * as ExpSchema from './ExpSchema';
import * as ProjectUtils from './ProjectUtils';

export const NO_ISSUES = 0;
export const WARNING = 1;
export const ERROR = 2;
export const FATAL = 3;

const MIN_WATCHMAN_VERSION = '4.6.0';
const MIN_NPM_VERSION = '3.0.0';
const CORRECT_NPM_VERSION = 'latest';
const WARN_NPM_VERSION_RANGES = ['>= 5.0.0 < 5.7.0'];
const BAD_NPM_VERSION_RANGES = ['>= 5.0.0 <= 5.0.3'];

function _isNpmVersionWithinRanges(npmVersion: string, ranges: string[]) {
  return _.some(ranges, range => semver.satisfies(npmVersion, range));
}

async function _checkNpmVersionAsync(projectRoot: string) {
  try {
    try {
      let yarnVersionResponse = await spawnAsync('yarnpkg', ['--version']);
      if (yarnVersionResponse.status === 0) {
        return NO_ISSUES;
      }
    } catch (e) {}

    let npmVersionResponse = await spawnAsync('npm', ['--version']);
    let npmVersion = _.trim(npmVersionResponse.stdout);

    if (
      semver.lt(npmVersion, MIN_NPM_VERSION) ||
      _isNpmVersionWithinRanges(npmVersion, BAD_NPM_VERSION_RANGES)
    ) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error: You are using npm version ${npmVersion}. We recommend the latest version ${CORRECT_NPM_VERSION}. To install it, run 'npm i -g npm@${CORRECT_NPM_VERSION}'.`,
        'doctor-npm-version'
      );
      return WARNING;
    } else if (_isNpmVersionWithinRanges(npmVersion, WARN_NPM_VERSION_RANGES)) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: You are using npm version ${npmVersion}. There may be bugs in this version, use it at your own risk. We recommend version ${CORRECT_NPM_VERSION}.`,
        'doctor-npm-version'
      );
    } else {
      ProjectUtils.clearNotification(projectRoot, 'doctor-npm-version');
    }
  } catch (e) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Could not determine npm version. Make sure your version is >= ${MIN_NPM_VERSION} - we recommend ${CORRECT_NPM_VERSION}.`,
      'doctor-npm-version'
    );
    return WARNING;
  }

  return NO_ISSUES;
}

async function _checkWatchmanVersionAsync(projectRoot: string) {
  // There's no point in checking any of this stuff if watchman isn't supported on this platform
  if (!Watchman.isPlatformSupported()) {
    ProjectUtils.clearNotification(projectRoot, 'doctor-watchman-version');
    return;
  }

  let watchmanVersion = await Watchman.unblockAndGetVersionAsync(projectRoot);

  // If we can't get the watchman version, `getVersionAsync` will return `null`
  if (!watchmanVersion) {
    // watchman is probably just not installed
    ProjectUtils.clearNotification(projectRoot, 'doctor-watchman-version');
    return;
  }

  if (semver.lt(watchmanVersion, MIN_WATCHMAN_VERSION)) {
    let warningMessage = `Warning: You are using an old version of watchman (v${watchmanVersion}). This may cause problems for you.\n\nWe recommend that you either uninstall watchman (and XDE will try to use a copy it is bundled with) or upgrade watchman to a newer version, at least v${MIN_WATCHMAN_VERSION}.`;

    // Add a note about homebrew if the user is on a Mac
    if (process.platform === 'darwin') {
      warningMessage += `\n\nIf you are using homebrew, try:\nbrew uninstall watchman; brew install watchman`;
    }
    ProjectUtils.logWarning(projectRoot, 'expo', warningMessage, 'doctor-watchman-version');
  } else {
    ProjectUtils.clearNotification(projectRoot, 'doctor-watchman-version');
  }
}

export async function validateWithSchemaFileAsync(
  projectRoot: string,
  schemaPath: string
): Promise<{ schemaErrorMessage: string | undefined; assetsErrorMessage: string | undefined }> {
  let { exp } = getConfig(projectRoot);
  let schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
  return validateWithSchema(projectRoot, exp, schema.schema, 'exp.json', 'UNVERSIONED', true);
}

export async function validateWithSchema(
  projectRoot: string,
  exp: any,
  schema: any,
  configName: string,
  sdkVersion: string,
  validateAssets: boolean
): Promise<{ schemaErrorMessage: string | undefined; assetsErrorMessage: string | undefined }> {
  let schemaErrorMessage;
  let assetsErrorMessage;
  let validator = new Schemer(schema, { rootDir: projectRoot });

  // Validate the schema itself
  try {
    await validator.validateSchemaAsync(exp);
  } catch (e) {
    if (e instanceof SchemerError) {
      schemaErrorMessage = `Error: Problem${
        e.errors.length > 1 ? 's' : ''
      } validating fields in ${configName}. See https://docs.expo.io/versions/v${sdkVersion}/workflow/configuration/`;
      schemaErrorMessage += e.errors.map(formatValidationError).join('');
    }
  }

  if (validateAssets) {
    try {
      await validator.validateAssetsAsync(exp);
    } catch (e) {
      if (e instanceof SchemerError) {
        assetsErrorMessage = `Error: Problem${
          e.errors.length > 1 ? '' : 's'
        } validating asset fields in ${configName}. See ${Config.helpUrl}`;
        assetsErrorMessage += e.errors.map(formatValidationError).join('');
      }
    }
  }
  return { schemaErrorMessage, assetsErrorMessage };
}

function formatValidationError(validationError: ValidationError) {
  return `\n • ${validationError.fieldPath ? 'Field: ' + validationError.fieldPath + ' - ' : ''}${
    validationError.message
  }.`;
}

async function _validateExpJsonAsync(
  exp: ExpoConfig,
  pkg: PackageJSONConfig,
  projectRoot: string,
  allowNetwork: boolean
): Promise<number> {
  if (!exp || !pkg) {
    // getConfig already logged an error
    return FATAL;
  }

  try {
    await _checkWatchmanVersionAsync(projectRoot);
  } catch (e) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Problem checking watchman version. ${e.message}.`,
      'doctor-problem-checking-watchman-version'
    );
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-problem-checking-watchman-version');

  const expJsonExists = await fileExistsAsync(path.join(projectRoot, 'exp.json'));
  const appJsonExists = await fileExistsAsync(path.join(projectRoot, 'app.json'));

  if (expJsonExists && appJsonExists) {
    ProjectUtils.logWarning(
      projectRoot,
      'expo',
      `Warning: Both app.json and exp.json exist in this directory. Only one should exist for a single project.`,
      'doctor-both-app-and-exp-json'
    );
    return WARNING;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-both-app-and-exp-json');

  let sdkVersion = exp.sdkVersion;
  const configName = configFilename(projectRoot);

  // Warn if sdkVersion is UNVERSIONED
  if (sdkVersion === 'UNVERSIONED' && !process.env.EXPO_SKIP_MANIFEST_VALIDATION_TOKEN) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: Using unversioned Expo SDK. Do not publish until you set sdkVersion in ${configName}`,
      'doctor-unversioned'
    );
    return ERROR;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-unversioned');
  let sdkVersions = await Versions.sdkVersionsAsync();
  if (!sdkVersions) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: Couldn't connect to SDK versions server`,
      'doctor-versions-endpoint-failed'
    );
    return ERROR;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-versions-endpoint-failed');

  if (!sdkVersion || !sdkVersions[sdkVersion]) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: Invalid sdkVersion. Valid options are ${_.keys(sdkVersions).join(', ')}`,
      'doctor-invalid-sdk-version'
    );
    return ERROR;
  }
  ProjectUtils.clearNotification(projectRoot, 'doctor-invalid-sdk-version');

  // Skip validation if the correct token is set in env
  if (sdkVersion !== 'UNVERSIONED') {
    try {
      let schema = await ExpSchema.getSchemaAsync(sdkVersion);
      let { schemaErrorMessage, assetsErrorMessage } = await validateWithSchema(
        projectRoot,
        exp,
        schema,
        configName,
        sdkVersion,
        allowNetwork
      );

      if (schemaErrorMessage) {
        ProjectUtils.logError(projectRoot, 'expo', schemaErrorMessage, 'doctor-schema-validation');
      } else {
        ProjectUtils.clearNotification(projectRoot, 'doctor-schema-validation');
      }
      if (assetsErrorMessage) {
        ProjectUtils.logError(
          projectRoot,
          'expo',
          assetsErrorMessage,
          `doctor-validate-asset-fields`
        );
      } else {
        ProjectUtils.clearNotification(projectRoot, `doctor-validate-asset-fields`);
      }
      ProjectUtils.clearNotification(projectRoot, 'doctor-schema-validation-exception');
      if (schemaErrorMessage || assetsErrorMessage) return ERROR;
    } catch (e) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: Problem validating ${configName}: ${e.message}.`,
        'doctor-schema-validation-exception'
      );
    }
  }

  const reactNativeIssue = await _validateReactNativeVersionAsync(
    exp,
    pkg,
    projectRoot,
    sdkVersions,
    sdkVersion
  );

  if (reactNativeIssue !== NO_ISSUES) {
    return reactNativeIssue;
  }

  // TODO: Check any native module versions here

  return NO_ISSUES;
}

async function _validateReactNativeVersionAsync(
  exp: ExpoConfig,
  pkg: PackageJSONConfig,
  projectRoot: string,
  sdkVersions: Versions.SDKVersions,
  sdkVersion: string
): Promise<number> {
  if (Config.validation.reactNativeVersionWarnings) {
    let reactNative = null;

    if (pkg.dependencies?.['react-native']) {
      reactNative = pkg.dependencies['react-native'];
    } else if (pkg.devDependencies?.['react-native']) {
      reactNative = pkg.devDependencies['react-native'];
    } else if (pkg.peerDependencies?.['react-native']) {
      reactNative = pkg.peerDependencies['react-native'];
    }

    // react-native is required
    if (!reactNative) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error: Can't find react-native in package.json dependencies`,
        'doctor-no-react-native-in-package-json'
      );
      return ERROR;
    }
    ProjectUtils.clearNotification(projectRoot, 'doctor-no-react-native-in-package-json');

    if (!exp.isDetached) {
      return NO_ISSUES;

      // (TODO-2017-07-20): Validate the react-native version if it uses
      // officially published package rather than Expo fork. Expo fork of
      // react-native was required before CRNA. We now only run the react-native
      // validation of the version if we are using the fork. We should probably
      // validate the version here as well such that it matches with the
      // react-native version compatible with the selected SDK.
    }

    // Expo fork of react-native is required
    if (!/expo\/react-native/.test(reactNative)) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: Not using the Expo fork of react-native. See ${Config.helpUrl}.`,
        'doctor-not-using-expo-fork'
      );
      return WARNING;
    }
    ProjectUtils.clearNotification(projectRoot, 'doctor-not-using-expo-fork');

    try {
      let reactNativeTag = reactNative.match(/sdk-\d+\.\d+\.\d+/)[0];
      let sdkVersionObject = sdkVersions[sdkVersion];

      // TODO: Want to be smarter about this. Maybe warn if there's a newer version.
      if (
        semver.major(Versions.parseSdkVersionFromTag(reactNativeTag)) !==
        semver.major(Versions.parseSdkVersionFromTag(sdkVersionObject['expoReactNativeTag']))
      ) {
        ProjectUtils.logWarning(
          projectRoot,
          'expo',
          `Warning: Invalid version of react-native for sdkVersion ${sdkVersion}. Use github:expo/react-native#${sdkVersionObject['expoReactNativeTag']}`,
          'doctor-invalid-version-of-react-native'
        );
        return WARNING;
      }
      ProjectUtils.clearNotification(projectRoot, 'doctor-invalid-version-of-react-native');

      ProjectUtils.clearNotification(projectRoot, 'doctor-malformed-version-of-react-native');
    } catch (e) {
      ProjectUtils.logWarning(
        projectRoot,
        'expo',
        `Warning: ${reactNative} is not a valid version. Version must be in the form of sdk-x.y.z. Please update your package.json file.`,
        'doctor-malformed-version-of-react-native'
      );
      return WARNING;
    }
  }

  return NO_ISSUES;
}

async function _validateNodeModulesAsync(projectRoot: string): Promise<number> {
  // Just need `nodeModulesPath` so it doesn't matter if expo is installed or the sdkVersion is defined.
  let { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  let nodeModulesPath = projectRoot;
  if (exp.nodeModulesPath) {
    nodeModulesPath = path.resolve(projectRoot, exp.nodeModulesPath);
  }

  // Check to make sure node_modules exists at all
  try {
    let result = fs.statSync(path.join(nodeModulesPath, 'node_modules'));
    if (!result.isDirectory()) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error: node_modules directory is missing. Please run \`npm install\` in your project directory.`,
        'doctor-node-modules-missing'
      );
      return FATAL;
    }

    ProjectUtils.clearNotification(projectRoot, 'doctor-node-modules-missing');
  } catch (e) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: node_modules directory is missing. Please run \`npm install\` in your project directory.`,
      'doctor-node-modules-missing'
    );
    return FATAL;
  }

  // Check to make sure react native is installed
  try {
    resolveModule('react-native/local-cli/cli.js', projectRoot, exp);
    ProjectUtils.clearNotification(projectRoot, 'doctor-react-native-not-installed');
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Error: React Native is not installed. Please run \`npm install\` in your project directory.`,
        'doctor-react-native-not-installed'
      );
      return FATAL;
    } else {
      throw e;
    }
  }
  return NO_ISSUES;
}

export async function validateWithoutNetworkAsync(projectRoot: string): Promise<number> {
  return validateAsync(projectRoot, false);
}

export async function validateWithNetworkAsync(projectRoot: string): Promise<number> {
  return validateAsync(projectRoot, true);
}

async function validateAsync(projectRoot: string, allowNetwork: boolean): Promise<number> {
  if (getenv.boolish('EXPO_NO_DOCTOR', false)) {
    return NO_ISSUES;
  }

  let exp, pkg;
  try {
    const config = getConfig(projectRoot);
    exp = config.exp;
    pkg = config.pkg;
  } catch (e) {
    ProjectUtils.logError(
      projectRoot,
      'expo',
      `Error: could not load config json at ${projectRoot}: ${e.toString()}`,
      'doctor-config-json-not-read'
    );
    return FATAL;
  }

  let status = await _checkNpmVersionAsync(projectRoot);
  if (status === FATAL) {
    return status;
  }

  const expStatus = await _validateExpJsonAsync(exp, pkg, projectRoot, allowNetwork);
  if (expStatus === FATAL) {
    return expStatus;
  }

  status = Math.max(status, expStatus);

  if (exp && !exp.ignoreNodeModulesValidation) {
    let nodeModulesStatus = await _validateNodeModulesAsync(projectRoot);
    if (nodeModulesStatus > status) {
      return nodeModulesStatus;
    }
  }

  return status;
}

type ExpoSdkStatus = 0 | 1 | 2;

export const EXPO_SDK_INSTALLED_AND_IMPORTED = 0;
export const EXPO_SDK_NOT_INSTALLED = 1;
export const EXPO_SDK_NOT_IMPORTED = 2;

export async function getExpoSdkStatus(projectRoot: string): Promise<ExpoSdkStatus> {
  const { pkg } = getPackageJson(projectRoot);

  try {
    if (
      !(
        pkg.dependencies?.['expo'] ||
        pkg.devDependencies?.['expo'] ||
        pkg.peerDependencies?.['expo']
      )
    ) {
      return EXPO_SDK_NOT_INSTALLED;
    }

    let mainFilePath = path.join(projectRoot, pkg.main);
    let mainFile = await fs.readFile(mainFilePath, 'utf8');

    // TODO: support separate .ios.js and .android.js files
    if (mainFile.includes(`from 'expo'`) || mainFile.includes(`require('expo')`)) {
      return EXPO_SDK_INSTALLED_AND_IMPORTED;
    } else {
      return EXPO_SDK_NOT_IMPORTED;
    }
  } catch (e) {
    return EXPO_SDK_NOT_IMPORTED;
  }
}
