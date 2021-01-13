import { ExpoConfig } from '@expo/config-types';
import semver from 'semver';

export function gteSdkVersion(exp: Pick<ExpoConfig, 'sdkVersion'>, sdkVersion: string): boolean {
  if (!exp.sdkVersion) {
    return false;
  }

  if (exp.sdkVersion === 'UNVERSIONED') {
    return false;
  }

  try {
    return semver.gte(exp.sdkVersion, sdkVersion);
  } catch {
    return false;
  }
}
