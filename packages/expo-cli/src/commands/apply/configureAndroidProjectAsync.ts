import { AndroidConfig, getConfig } from '@expo/config';
import { sync as globSync } from 'glob';
import fs from 'fs-extra';
import path from 'path';
import buildGeneric from '@expo/build-tools/dist/platforms/android/generic/builder';

async function modifyBuildGradleAsync(
  projectRoot: string,
  callback: (buildGradle: string) => string
) {
  let buildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  let buildGradleString = fs.readFileSync(buildGradlePath).toString();
  // console.log(buildGradleString);
  let result = callback(buildGradleString);
  console.log(result);
  fs.writeFileSync(buildGradlePath, result);
}

async function modifyAndroidManifestAsync() {}

export default async function configureAndroidProjectAsync(projectRoot: string) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  await modifyBuildGradleAsync(projectRoot, (buildGradle: string) => {
    buildGradle = AndroidConfig.Package.setPackageInBuildGradle(exp, buildGradle);
    buildGradle = AndroidConfig.Version.setVersionCode(exp, buildGradle);
    buildGradle = AndroidConfig.Version.setVersionName(exp, buildGradle);
    return buildGradle;
  });

  // await modifyAndroidManifestAsync(projectRoot, androidManifest => {
  // TODO: modify androidManifest once, make `setX` functions take the androidManifest xml object and do the work on that
  // });
  await AndroidConfig.Package.setPackageInAndroidManifest(exp, projectRoot);
  await AndroidConfig.Orientation.setAndroidOrientation(exp, projectRoot);
  await AndroidConfig.Permissions.setAndroidPermissions(exp, projectRoot);
  await AndroidConfig.RootViewBackgroundColor.setRootViewBackgroundColor(exp, projectRoot);
  await AndroidConfig.Branch.setBranchApiKey(exp, projectRoot);
  await AndroidConfig.Facebook.setFacebookConfig(exp, projectRoot);
  await AndroidConfig.NavigationBar.setNavigationBarConfig(exp, projectRoot);
  await AndroidConfig.StatusBar.setStatusBarConfig(exp, projectRoot);
  await AndroidConfig.PrimaryColor.setPrimaryColor(exp, projectRoot);
  await AndroidConfig.UserInterfaceStyle.setUiModeAndroidManifest(exp, projectRoot);
  await AndroidConfig.GoogleServices.setGoogleServicesFile(exp, projectRoot);
  await AndroidConfig.GoogleMobileAds.setGoogleMobileAdsConfig(exp, projectRoot);
  await AndroidConfig.GoogleMapsApiKey.setGoogleMapsApiKey(exp, projectRoot);
  await AndroidConfig.IntentFilters.setAndroidIntentFilters(exp, projectRoot);
}
