/**
 * @flow
 */

import semver from 'semver';

export function gteSdkVersion(expJson: any, sdkVersion: string): boolean {
  if (!expJson.sdkVersion) {
    return false;
  }

  if (expJson.sdkVersion === 'UNVERSIONED') {
    return true;
  }

  return semver.gte(expJson.sdkVersion, sdkVersion);
}
