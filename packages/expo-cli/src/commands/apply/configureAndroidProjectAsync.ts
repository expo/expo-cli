import { AndroidConfig, getConfig, WarningAggregator } from '@expo/config';
import { UserManager } from '@expo/xdl';
import fs from 'fs-extra';

import { getOrPromptForPackage } from '../eject/ConfigValidation';

async function modifyBuildGradleAsync(
  projectRoot: string,
  callback: (buildGradle: string) => string
) {
  const buildGradlePath = AndroidConfig.Paths.getAndroidBuildGradle(projectRoot);
  const buildGradleString = fs.readFileSync(buildGradlePath).toString();
  const result = callback(buildGradleString);
  fs.writeFileSync(buildGradlePath, result);
}

async function modifyAppBuildGradleAsync(
  projectRoot: string,
  callback: (buildGradle: string) => string
) {
  const buildGradlePath = AndroidConfig.Paths.getAppBuildGradle(projectRoot);
  const buildGradleString = fs.readFileSync(buildGradlePath).toString();
  const result = callback(buildGradleString);
  fs.writeFileSync(buildGradlePath, result);
}

async function modifyAndroidManifestAsync(
  projectRoot: string,
  callback: (androidManifest: AndroidConfig.Manifest.Document) => AndroidConfig.Manifest.Document
) {
  const androidManifestPath = await AndroidConfig.Manifest.getProjectAndroidManifestPathAsync(
    projectRoot
  );
  if (!androidManifestPath) {
    throw new Error(`Could not find AndroidManifest.xml in project directory: "${projectRoot}"`);
  }
  const androidManifestJSON = await AndroidConfig.Manifest.readAndroidManifestAsync(
    androidManifestPath
  );
  const result = await callback(androidManifestJSON);
  await AndroidConfig.Manifest.writeAndroidManifestAsync(androidManifestPath, result);
}

async function modifyMainActivityAsync(
  projectRoot: string,
  callback: (props: { contents: string; language: 'java' | 'kt' }) => Promise<string>
) {
  const mainActivity = await AndroidConfig.Paths.getMainActivityAsync(projectRoot);

  const contents = fs.readFileSync(mainActivity.path).toString();
  const result = await callback({ contents, language: mainActivity.language });
  fs.writeFileSync(mainActivity.path, result);
}

export default async function configureAndroidProjectAsync(projectRoot: string) {
  // Check package before reading the config because it may mutate the config if the user is prompted to define it.
  await getOrPromptForPackage(projectRoot);

  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const username = await UserManager.getCurrentUsernameAsync();

  await modifyBuildGradleAsync(projectRoot, (buildGradle: string) => {
    buildGradle = AndroidConfig.GoogleServices.setClassPath(exp, buildGradle);
    return buildGradle;
  });

  await modifyAppBuildGradleAsync(projectRoot, (buildGradle: string) => {
    buildGradle = AndroidConfig.GoogleServices.applyPlugin(exp, buildGradle);
    buildGradle = AndroidConfig.Package.setPackageInBuildGradle(exp, buildGradle);
    buildGradle = AndroidConfig.Version.setVersionCode(exp, buildGradle);
    buildGradle = AndroidConfig.Version.setVersionName(exp, buildGradle);
    return buildGradle;
  });

  await modifyAndroidManifestAsync(projectRoot, async androidManifest => {
    androidManifest = await AndroidConfig.Package.setPackageInAndroidManifest(exp, androidManifest);
    androidManifest = await AndroidConfig.AllowBackup.setAllowBackup(exp, androidManifest);
    androidManifest = await AndroidConfig.Scheme.setScheme(exp, androidManifest);
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

    androidManifest = await AndroidConfig.Updates.setUpdatesConfig(exp, androidManifest, username);

    return androidManifest;
  });

  await modifyMainActivityAsync(projectRoot, async ({ contents, language }) => {
    if (language === 'java') {
      contents = AndroidConfig.UserInterfaceStyle.addOnConfigurationChangedMainActivity(
        exp,
        contents
      );
    } else {
      WarningAggregator.addWarningAndroid(
        'userInterfaceStyle',
        `Cannot automatically configure MainActivity if it's not java`
      );
    }
    return contents;
  });

  // If we renamed the package, we should also move it around and rename it in source files
  await AndroidConfig.Package.renamePackageOnDisk(exp, projectRoot);

  // Modify colors.xml and styles.xml
  await AndroidConfig.RootViewBackgroundColor.setRootViewBackgroundColor(exp, projectRoot);
  await AndroidConfig.NavigationBar.setNavigationBarConfig(exp, projectRoot);
  await AndroidConfig.StatusBar.setStatusBarConfig(exp, projectRoot);
  await AndroidConfig.PrimaryColor.setPrimaryColor(exp, projectRoot);

  // Modify strings.xml
  await AndroidConfig.Facebook.setFacebookAppIdString(exp, projectRoot);
  await AndroidConfig.Name.setName(exp, projectRoot);

  // add google-services.json to project
  await AndroidConfig.GoogleServices.setGoogleServicesFile(exp, projectRoot);

  // TODOs
  await AndroidConfig.SplashScreen.setSplashScreenAsync(exp, projectRoot);
  await AndroidConfig.Icon.setIconAsync(exp, projectRoot);
}
