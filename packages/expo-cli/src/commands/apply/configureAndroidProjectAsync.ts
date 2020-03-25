import { AndroidConfig, getConfig } from '@expo/config';
import { sync as globSync } from 'glob';
import fs from 'fs-extra';
import path from 'path';

async function modifyBuildGradleAsync(
  projectRoot: string,
  callback: (buildGradle: string) => string
) {
  let buildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  let buildGradleString = fs.readFileSync(buildGradlePath).toString();
  let result = callback(buildGradleString);
  fs.writeFileSync(buildGradlePath, result);
}

async function modifyAndroidManifestAsync(
  projectRoot: string,
  callback: (androidManifest: AndroidConfig.Manifest.Document) => AndroidConfig.Manifest.Document
) {
  let androidManifestPath = await AndroidConfig.Manifest.getProjectAndroidManifestPathAsync(
    projectRoot
  );
  if (!androidManifestPath) {
    throw new Error(`Could not find AndroidManifest.xml in project directory: "${projectRoot}"`);
  }
  let androidManifestJSON = await AndroidConfig.Manifest.readAndroidManifestAsync(
    androidManifestPath
  );
  let result = await callback(androidManifestJSON);
  await AndroidConfig.Manifest.writeAndroidManifestAsync(androidManifestPath, result);
}

export default async function configureAndroidProjectAsync(projectRoot: string) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  await modifyBuildGradleAsync(projectRoot, (buildGradle: string) => {
    buildGradle = AndroidConfig.Package.setPackageInBuildGradle(exp, buildGradle);
    buildGradle = AndroidConfig.Version.setVersionCode(exp, buildGradle);
    buildGradle = AndroidConfig.Version.setVersionName(exp, buildGradle);
    return buildGradle;
  });

  await modifyAndroidManifestAsync(projectRoot, async androidManifest => {
    androidManifest = await AndroidConfig.Package.setPackageInAndroidManifest(exp, androidManifest);
    androidManifest = await AndroidConfig.Orientation.setAndroidOrientation(exp, androidManifest);
    androidManifest = await AndroidConfig.Permissions.setAndroidPermissions(exp, androidManifest);
    androidManifest = await AndroidConfig.Branch.setBranchApiKey(exp, androidManifest);
    androidManifest = await AndroidConfig.Facebook.setFacebookConfig(exp, androidManifest);
    androidManifest = await AndroidConfig.UserInterfaceStyle.setUiModeAndroidManifest(
      exp,
      androidManifest
    );
    androidManifest = await AndroidConfig.GoogleMobileAds.setGoogleMobileAdsConfig(
      exp,
      androidManifest
    );
    androidManifest = await AndroidConfig.GoogleMapsApiKey.setGoogleMapsApiKey(
      exp,
      androidManifest
    );
    androidManifest = await AndroidConfig.IntentFilters.setAndroidIntentFilters(
      exp,
      androidManifest
    );

    return androidManifest;
  });

  // Modify colors.xml and styles.xml
  await AndroidConfig.RootViewBackgroundColor.setRootViewBackgroundColor(exp, projectRoot);
  await AndroidConfig.NavigationBar.setNavigationBarConfig(exp, projectRoot);
  await AndroidConfig.StatusBar.setStatusBarConfig(exp, projectRoot);
  await AndroidConfig.PrimaryColor.setPrimaryColor(exp, projectRoot);

  // add google-services.json to project
  await AndroidConfig.GoogleServices.setGoogleServicesFile(exp, projectRoot);
}
