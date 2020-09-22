import { AndroidConfig, getConfig } from '@expo/config';
import { Document } from '@expo/config/build/android/Manifest';
import { withPlugins } from '@expo/config/build/plugins/withPlugins';
import { UserManager } from '@expo/xdl';

import { getOrPromptForPackage } from '../eject/ConfigValidation';
import { commitFilesAsync, getFileSystemAndroidAsync } from './configureFileSystem';

type ModifyFileProps<T> = { data: T; filePath: string };
type ModifyFileTransform<T> = (props: ModifyFileProps<T>) => Promise<T>;

async function modifyXMLFileAsync(filePath: string, callback: ModifyFileTransform<Document>) {
  const data = await AndroidConfig.Manifest.readXMLAsync({ path: filePath });
  const result = await callback({ data, filePath });
  await AndroidConfig.Manifest.writeXMLAsync({ path: filePath, xml: result });
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

async function compileAndroidPluginsAsync(
  projectRoot: string,
  { expo, pack }: ExportedConfig
): Promise<{ projectFileSystem: ProjectFileSystem }> {
  const projectFileSystem = await getFileSystemAndroidAsync(projectRoot);

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
  await pack?.android?.after?.(projectFileSystem);

  return { projectFileSystem };
}

function getExportedConfig(projectRoot: string): ExportedConfig {
  const originalConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return { expo: originalConfig.exp, pack: originalConfig.pack };
}

export default async function configureAndroidProjectAsync(projectRoot: string) {
  // Check package before reading the config because it may mutate the config if the user is prompted to define it.
  await getOrPromptForPackage(projectRoot);

  const { expo, pack } = withPlugins(
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
      [AndroidConfig.Updates.withUpdates, await UserManager.getCurrentUsernameAsync()],
      AndroidConfig.UserInterfaceStyle.withOnConfigurationChangedMainActivity,
      AndroidConfig.Facebook.withFacebookAppIdString,
      AndroidConfig.Name.withName,
      AndroidConfig.PrimaryColor.withPrimaryColor,
      AndroidConfig.RootViewBackgroundColor.withRootViewBackgroundColor,
      AndroidConfig.NavigationBar.withNavigationBarConfig,
      AndroidConfig.StatusBar.withStatusBarConfig,
      AndroidConfig.Icon.withIcons,
    ],
    getExportedConfig(projectRoot)
  );

  const { projectFileSystem } = await compileAndroidPluginsAsync(projectRoot, { expo, pack });
  await commitFilesAsync(projectFileSystem);

  // If we renamed the package, we should also move it around and rename it in source files
  await AndroidConfig.Package.renamePackageOnDisk(expo, projectRoot);
  await AndroidConfig.SplashScreen.setSplashScreenAsync(expo, projectRoot);
}
