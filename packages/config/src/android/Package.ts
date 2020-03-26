import { ExpoConfig } from '../Config.types';
import { Document } from './Manifest';

export function getPackage(config: ExpoConfig) {
  if (config.android && config.android.package) {
    return config.android.package;
  }

  return null;
}

export function setPackageInBuildGradle(config: ExpoConfig, buildGradle: string) {
  let packageName = getPackage(config);
  if (packageName === null) {
    return buildGradle;
  }

  let pattern = new RegExp(`applicationId ['"].*['"]`);
  return buildGradle.replace(pattern, `applicationId '${packageName}'`);
}

export async function setPackageInAndroidManifest(config: ExpoConfig, manifestDocument: Document) {
  let packageName = getPackage(config);

  manifestDocument['manifest']['$']['package'] = packageName;

  return manifestDocument;
}
