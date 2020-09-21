import { AndroidConfig, getConfig } from '@expo/config';
import { withPlugins } from '@expo/config/build/plugins/withPlugins';
import { UserManager } from '@expo/xdl';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import path from 'path';

import { getOrPromptForPackage } from '../eject/ConfigValidation';
import { commitFilesAsync, getFileSystemAndroidAsync } from './configureFileSystem';

type ModifyFileProps = { data: string; filePath: string };
type ModifyFileTransform = (props: ModifyFileProps) => Promise<string>;

async function modifyFileAsync(filePath: string, callback: ModifyFileTransform) {
  const data = fs.readFileSync(filePath).toString();
  const result = callback({ data, filePath });
  fs.writeFileSync(filePath, result);
}

async function modifyBuildGradleAsync(projectRoot: string, callback: ModifyFileTransform) {
  const filePath = path.join(projectRoot, 'android', 'build.gradle');
  return modifyFileAsync(filePath, callback);
}

async function modifyAppBuildGradleAsync(projectRoot: string, callback: ModifyFileTransform) {
  const filePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  return modifyFileAsync(filePath, callback);
}

async function modifyMainActivityJavaAsync(projectRoot: string, callback: ModifyFileTransform) {
  const filePath = globSync(
    path.join(projectRoot, 'android/app/src/main/java/**/MainActivity.java')
  )[0];
  return modifyFileAsync(filePath, callback);
}

async function modifyAndroidManifestAsync(
  projectRoot: string,
  callback: (props: {
    androidManifest: AndroidConfig.Manifest.Document;
    filePath: string;
  }) => AndroidConfig.Manifest.Document
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
  const result = await callback({
    androidManifest: androidManifestJSON,
    filePath: androidManifestPath,
  });
  await AndroidConfig.Manifest.writeAndroidManifestAsync(androidManifestPath, result);
}

export default async function configureAndroidProjectAsync(projectRoot: string) {
  // Check package before reading the config because it may mutate the config if the user is prompted to define it.
  await getOrPromptForPackage(projectRoot);

  const projectFileSystem = await getFileSystemAndroidAsync(projectRoot);
  const originalConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const { expo: exp, pack } = withPlugins(
    [
      AndroidConfig.Facebook.withFacebook,
      AndroidConfig.Branch.withBranch,
      AndroidConfig.AllowBackup.withAllowBackup,
    ],
    { expo: originalConfig.exp, pack: originalConfig.pack }
  );

  const username = await UserManager.getCurrentUsernameAsync();

  await modifyBuildGradleAsync(projectRoot, async ({ data, filePath }) => {
    data = AndroidConfig.GoogleServices.setClassPath(exp, data);

    if (typeof pack?.android?.dangerousBuildGradle === 'function') {
      data = (
        await pack.android.dangerousBuildGradle({
          ...projectFileSystem,
          data,
          filePath,
        })
      ).data!;
    }
    return data;
  });
  await modifyAppBuildGradleAsync(projectRoot, async ({ data, filePath }) => {
    data = AndroidConfig.GoogleServices.applyPlugin(exp, data);
    data = AndroidConfig.Package.setPackageInBuildGradle(exp, data);
    data = AndroidConfig.Version.setVersionCode(exp, data);
    data = AndroidConfig.Version.setVersionName(exp, data);

    if (typeof pack?.android?.dangerousAppBuildGradle === 'function') {
      data = (
        await pack.android.dangerousAppBuildGradle({
          ...projectFileSystem,
          data,
          filePath,
        })
      ).data!;
    }
    return data;
  });

  await modifyAndroidManifestAsync(projectRoot, async ({ androidManifest, filePath }) => {
    androidManifest = await AndroidConfig.Package.setPackageInAndroidManifest(exp, androidManifest);
    androidManifest = await AndroidConfig.Scheme.setScheme(exp, androidManifest);
    androidManifest = await AndroidConfig.Orientation.setAndroidOrientation(exp, androidManifest);
    androidManifest = await AndroidConfig.Permissions.setAndroidPermissions(exp, androidManifest);
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

    if (typeof pack?.android?.manifest === 'function') {
      androidManifest = (
        await pack.android.manifest({
          ...projectFileSystem,
          data: androidManifest,
          filePath,
        })
      ).data!;
    }

    return androidManifest;
  });

  await modifyMainActivityJavaAsync(projectRoot, async ({ data, filePath }) => {
    data = AndroidConfig.UserInterfaceStyle.addOnConfigurationChangedMainActivity(exp, data);

    if (typeof pack?.android?.dangerousMainActivity === 'function') {
      data = (
        await pack.android.dangerousMainActivity({
          ...projectFileSystem,
          data,
          filePath,
        })
      ).data!;
    }
    return data;
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

  await commitFilesAsync(projectFileSystem);
}
