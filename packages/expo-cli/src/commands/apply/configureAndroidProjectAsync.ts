import { AndroidConfig, getConfig } from '@expo/config';
import { Document } from '@expo/config/build/android/Manifest';
import { withPlugins } from '@expo/config/build/plugins/withPlugins';
import { UserManager } from '@expo/xdl';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import path from 'path';

import { getOrPromptForPackage } from '../eject/ConfigValidation';
import { commitFilesAsync, getFileSystemAndroidAsync } from './configureFileSystem';

type ModifyFileProps<T> = { data: T; filePath: string };
type ModifyFileTransform<T> = (props: ModifyFileProps<T>) => Promise<T>;

async function modifyFileAsync(filePath: string, callback: ModifyFileTransform<string>) {
  const data = fs.readFileSync(filePath).toString();
  const result = await callback({ data, filePath });
  fs.writeFileSync(filePath, result);
}

async function modifyXMLFileAsync(filePath: string, callback: ModifyFileTransform<Document>) {
  const data = await AndroidConfig.Manifest.readXMLAsync({ path: filePath });
  const result = await callback({ data, filePath });
  await AndroidConfig.Manifest.writeXMLAsync({ path: filePath, xml: result });
}

async function modifyBuildGradleAsync(projectRoot: string, callback: ModifyFileTransform<string>) {
  const filePath = path.join(projectRoot, 'android', 'build.gradle');
  return modifyFileAsync(filePath, callback);
}

async function modifyAppBuildGradleAsync(
  projectRoot: string,
  callback: ModifyFileTransform<string>
) {
  const filePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  return modifyFileAsync(filePath, callback);
}

async function modifyMainActivityJavaAsync(
  projectRoot: string,
  callback: ModifyFileTransform<string>
) {
  const filePath = globSync(
    path.join(projectRoot, 'android/app/src/main/java/**/MainActivity.java')
  )[0];
  return modifyFileAsync(filePath, callback);
}

async function modifyAndroidManifestAsync(
  projectRoot: string,
  callback: ModifyFileTransform<AndroidConfig.Manifest.Document>
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
    data: androidManifestJSON,
    filePath: androidManifestPath,
  });
  await AndroidConfig.Manifest.writeAndroidManifestAsync(androidManifestPath, result);
}

export default async function configureAndroidProjectAsync(projectRoot: string) {
  // Check package before reading the config because it may mutate the config if the user is prompted to define it.
  await getOrPromptForPackage(projectRoot);
  const username = await UserManager.getCurrentUsernameAsync();

  const projectFileSystem = await getFileSystemAndroidAsync(projectRoot);

  const originalConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const { expo: exp, pack } = withPlugins(
    [
      AndroidConfig.Facebook.withFacebook,
      AndroidConfig.Branch.withBranch,
      AndroidConfig.AllowBackup.withAllowBackup,
      AndroidConfig.GoogleServices.withGoogleServices,
      AndroidConfig.Package.withAppGradle,
      AndroidConfig.Version.withVersionCode,
      AndroidConfig.Version.withVersionName,
      AndroidConfig.Package.withPackageManifest,
      AndroidConfig.Scheme.withScheme,
      AndroidConfig.Orientation.withOrientation,
      AndroidConfig.Permissions.withPermissions,
      AndroidConfig.UserInterfaceStyle.withUIModeManifest,
      AndroidConfig.GoogleMobileAds.withGoogleMobileAdsConfig,
      AndroidConfig.GoogleMapsApiKey.withGoogleMapsApiKey,
      AndroidConfig.IntentFilters.withIntentFilters,
      [AndroidConfig.Updates.withUpdates, username],
      AndroidConfig.UserInterfaceStyle.withOnConfigurationChangedMainActivity,
      AndroidConfig.Facebook.withFacebookAppIdString,
      AndroidConfig.Name.withName,
      AndroidConfig.PrimaryColor.withPrimaryColor,
      AndroidConfig.RootViewBackgroundColor.withRootViewBackgroundColor,
      AndroidConfig.NavigationBar.withNavigationBarConfig,
      AndroidConfig.StatusBar.withStatusBarConfig,
      AndroidConfig.Icon.withIcons,
    ],
    { expo: originalConfig.exp, pack: originalConfig.pack }
  );

  await modifyBuildGradleAsync(projectRoot, async ({ data, filePath }) => {
    if (typeof pack?.android?.dangerousBuildGradle === 'function') {
      data = (
        await pack.android.dangerousBuildGradle({
          ...projectFileSystem,
          data,
          filePath,
        })
      ).data;
    }
    return data;
  });
  await modifyAppBuildGradleAsync(projectRoot, async ({ data, filePath }) => {
    if (typeof pack?.android?.dangerousAppBuildGradle === 'function') {
      data = (
        await pack.android.dangerousAppBuildGradle({
          ...projectFileSystem,
          data,
          filePath,
        })
      ).data;
    }
    return data;
  });
  await modifyAndroidManifestAsync(projectRoot, async ({ data, filePath }) => {
    if (typeof pack?.android?.manifest === 'function') {
      data = (
        await pack.android.manifest({
          ...projectFileSystem,
          data,
          filePath,
        })
      ).data!;
    }
    return data;
  });
  await modifyMainActivityJavaAsync(projectRoot, async ({ data, filePath }) => {
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

  const stringsPath = await AndroidConfig.Strings.getProjectStringsXMLPathAsync(projectRoot);
  if (stringsPath) {
    await modifyXMLFileAsync(stringsPath, async ({ data, filePath }) => {
      if (typeof pack?.android?.strings === 'function') {
        data = (
          await pack.android.strings({
            ...projectFileSystem,
            kind: 'values',
            data,
            filePath,
          })
        ).data!;
      }
      return data;
    });
  }

  // If we renamed the package, we should also move it around and rename it in source files
  await AndroidConfig.Package.renamePackageOnDisk(exp, projectRoot);
  await AndroidConfig.SplashScreen.setSplashScreenAsync(exp, projectRoot);

  await pack?.android?.after?.(projectFileSystem);

  await commitFilesAsync(projectFileSystem);
}
