import { ExpoConfig } from '../Config.types';

const DEFAULT_PACKAGE_NAME = 'com.helloworld';

export function getPackage(config: ExpoConfig) {
  if (config.android && config.android.package) {
    return config.android.package;
  }

  return null;
}

export function setPackageInBuildGradle(
  config: ExpoConfig,
  buildGradle: string,
  packageNameToReplace = DEFAULT_PACKAGE_NAME
) {
  let packageName = getPackage(config);
  if (packageName === null) {
    return buildGradle;
  }

  let pattern = new RegExp(`applicationId ['"]${packageNameToReplace}['"]`);
  return buildGradle.replace(pattern, `applicationId '${packageName}'`);
}

export function setPackageInAndroidManifest(
  config: ExpoConfig,
  androidManifest: string,
  packageNameToReplace = DEFAULT_PACKAGE_NAME
) {
  let packageName = getPackage(config);
  if (packageName === null) {
    return androidManifest;
  }

  let pattern = new RegExp(`package="${packageNameToReplace}"`);
  return androidManifest.replace(pattern, `package="${packageName}"`);
}
