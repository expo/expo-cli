import { ExpoConfig } from '../Config.types';
import {
  getProjectAndroidManifestPathAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from './Manifest';

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

export async function setPackageInAndroidManifest(config: ExpoConfig, projectDirectory: string) {
  let packageName = getPackage(config);
  let manifestPath = await getProjectAndroidManifestPathAsync(projectDirectory);
  if (!packageName || !manifestPath) {
    return false;
  }

  let androidManifestJson = await readAndroidManifestAsync(manifestPath);
  androidManifestJson['manifest']['$']['package'] = packageName;

  try {
    await writeAndroidManifestAsync(manifestPath, androidManifestJson);
  } catch (e) {
    throw new Error(
      `Error setting Android package. Cannot write new AndroidManifest.xml to ${manifestPath}.`
    );
  }
  return true;
}
