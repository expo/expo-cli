/**
 * @flow
 */

import 'instapromise';

import _ from 'lodash';
import fs from 'fs';
import joi from 'joi';
import path from 'path';
import semver from 'semver';

import Api from '../Api';
import Config from '../Config';
import ExpSchema from './ExpSchema';
import * as ProjectUtils from './ProjectUtils';
import * as Versions from '../Versions';

export const NO_ISSUES = 0;
export const WARNING = 1;
export const FATAL = 2;

async function _validatePackageJsonAndExpJsonAsync(projectRoot): Promise<number>  {
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);

  if (!exp || !pkg) {
    // readConfigJsonAsync already logged an error
    return FATAL;
  }

  try {
    await joi.promise.validate(exp, ExpSchema);
  } catch (e) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: Problem in exp.json. ${e.message}. See ${Config.helpUrl}.`);
    return FATAL;
  }

  // Warn if sdkVersion is UNVERSIONED
  let sdkVersion = exp.sdkVersion;
  if (sdkVersion === 'UNVERSIONED') {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Using unversioned Exponent SDK. Do not publish until you set sdkVersion in exp.json`);
    return WARNING;
  }

  // react-native is required
  if (!pkg.dependencies || !pkg.dependencies['react-native']) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Can't find react-native in package.json dependencies`);
    return WARNING;
  }

  let sdkVersions = await Api.sdkVersionsAsync();
  if (!sdkVersions) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Couldn't connect to server`);
    return WARNING;
  }

  if (!sdkVersions[sdkVersion]) {
    ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Invalid sdkVersion. Valid options are ${_.keys(sdkVersions).join(', ')}`);
    return WARNING;
  }

  if (Config.validation.reactNativeVersionWarnings) {
    let reactNative = pkg.dependencies['react-native'];

    // Exponent fork of react-native is required
    if (!reactNative.match(/exponentjs\/react-native/)) {
      ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Not using the Exponent fork of react-native. See ${Config.helpUrl}.`);
      return WARNING;
    }

    let reactNativeTag = reactNative.substring(reactNative.lastIndexOf('#') + 1);
    let sdkVersionObject = sdkVersions[sdkVersion];
    try {
      // TODO: Want to be smarter about this. Maybe warn if there's a newer version.
      if (semver.major(Versions.parseSdkVersionFromTag(reactNativeTag)) !==
          semver.major(Versions.parseSdkVersionFromTag(sdkVersionObject['exponentReactNativeTag']))) {
        ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: Invalid version of react-native for sdkVersion ${sdkVersion}. Use github:exponentjs/react-native#${sdkVersionObject['exponentReactNativeTag']}`);
        return WARNING;
      }
    } catch (e) {
      ProjectUtils.logWarning(projectRoot, 'exponent', `Warning: ${reactNative} is not a valid version. Version must be in the form of sdk-x.y.z. Please update your package.json file.`);
      return WARNING;
    }
  }

  // TODO: Check any native module versions here

  return NO_ISSUES;
}

async function _validateNodeModulesAsync(projectRoot): Promise<number>  {
  try {
    let result = fs.statSync(path.join(projectRoot, 'node_modules'));
    if (!result.isDirectory()) {
      ProjectUtils.logError(projectRoot, 'exponent', `Error: node_modules directory is missing. Please run \`npm install\` in your project directory.`);
      return FATAL;
    }
  } catch (e) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: node_modules directory is missing. Please run \`npm install\` in your project directory.`);
    return FATAL;
  }

  try {
    let result = fs.statSync(path.join(projectRoot, 'node_modules', 'react-native', 'local-cli', 'cli.js'));
    if (!result.isFile()) {
      ProjectUtils.logError(projectRoot, 'exponent', `Error: React native is not installed. Please run \`npm install\` in your project directory.`);
      return FATAL;
    }
  } catch (e) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: React native is not installed. Please run \`npm install\` in your project directory.`);
    return FATAL;
  }

  return NO_ISSUES;
}

export async function validateAsync(projectRoot: string): Promise<number> {
  let status = NO_ISSUES;

  let newStatus = await _validatePackageJsonAndExpJsonAsync(projectRoot);
  if (newStatus > status) {
    status = newStatus;
  }

  let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  if (!exp) {
    exp = {};
  }

  if (!exp.ignoreNodeModulesValidation) {
    newStatus = await _validateNodeModulesAsync(projectRoot);
    if (newStatus > status) {
      status = newStatus;
    }
  }

  return status;
}

export const EXPONENT_SDK_INSTALLED_AND_IMPORTED = 0;
export const EXPONENT_SDK_NOT_INSTALLED = 1;
export const EXPONENT_SDK_NOT_IMPORTED = 2;

export async function getExponentSdkStatus(projectRoot: string): Promise<number> {
  let { pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  try {
    let exponentDep = pkg.dependencies['exponent'];
    if (!exponentDep) {
      return EXPONENT_SDK_NOT_INSTALLED;
    }

    let mainFilePath = path.join(projectRoot, pkg.main);
    let mainFile = await fs.readFile.promise(mainFilePath, 'utf8');

    // TODO: support separate .ios.js and .android.js files
    if (mainFile.includes(`from 'exponent'`) || mainFile.includes(`require('exponent')`)) {
      return EXPONENT_SDK_INSTALLED_AND_IMPORTED;
    } else {
      return EXPONENT_SDK_NOT_IMPORTED;
    }
  } catch (e) {
    return EXPONENT_SDK_NOT_IMPORTED;
  }
}
