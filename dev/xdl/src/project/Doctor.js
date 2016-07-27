/**
 * @flow
 */

import _ from 'lodash';
import semver from 'semver';

import Api from '../Api';
import Config from '../Config';
import * as ProjectUtils from './ProjectUtils';
import * as Versions from '../Versions';

export async function validateAsync(projectRoot: string): Promise<boolean> {
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectRoot);

  if (!exp || !pkg) {
    // readConfigJsonAsync already logged an error
    return false;
  }

  // sdkVersion is necessary
  if (!exp.sdkVersion) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: Can't find key exp.sdkVersion in exp.json or package.json. See https://docs.getexponent.com/`);
    return false;
  }

  // Warn if sdkVersion is UNVERSIONED
  let sdkVersion = exp.sdkVersion;
  if (sdkVersion === 'UNVERSIONED') {
    ProjectUtils.logError(projectRoot, 'exponent', `Warning: Using unversioned Exponent SDK. Do not publish until you set sdkVersion in exp.json`);
    return false;
  }

  // react-native is required
  if (!pkg.dependencies || !pkg.dependencies['react-native']) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: Can't find react-native in package.json dependencies`);
    return false;
  }

  let sdkVersions = await Api.sdkVersionsAsync();
  if (!sdkVersions) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: Couldn't connect to server`);
    return false;
  }

  if (!sdkVersions[sdkVersion]) {
    ProjectUtils.logError(projectRoot, 'exponent', `Error: Invalid sdkVersion. Valid options are ${_.keys(sdkVersions).join(', ')}`);
    return false;
  }

  if (Config.validation.reactNativeVersionWarnings) {
    let reactNative = pkg.dependencies['react-native'];

    // Exponent fork of react-native is required
    if (!reactNative.match(/exponentjs\/react-native/)) {
      ProjectUtils.logError(projectRoot, 'exponent', `Error: Must use the Exponent fork of react-native. See https://getexponent.com/help`);
      return false;
    }

    let reactNativeTag = reactNative.substring(reactNative.lastIndexOf('#') + 1);
    let sdkVersionObject = sdkVersions[sdkVersion];
    // TODO: Want to be smarter about this. Maybe warn if there's a newer version.
    if (semver.major(Versions.parseSdkVersionFromTag(reactNativeTag)) !==
        semver.major(Versions.parseSdkVersionFromTag(sdkVersionObject['exponentReactNativeTag']))) {
      ProjectUtils.logError(projectRoot, 'exponent', `Error: Invalid version of react-native for sdkVersion ${sdkVersion}. Use github:exponentjs/react-native#${sdkVersionObject['exponentReactNativeTag']}`);
      return false;
    }
  }

  // TODO: Check any native module versions here

  return true;
}
