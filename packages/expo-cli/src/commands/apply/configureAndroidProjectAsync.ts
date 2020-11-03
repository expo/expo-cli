import { AndroidConfig, getConfig, getConfigWithMods, WarningAggregator } from '@expo/config';
import { withExpoAndroidPlugins } from '@expo/config/build/plugins/expo-plugins';
import { compileModsAsync } from '@expo/config/build/plugins/mod-compiler';
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
  const packageName = await getOrPromptForPackage(projectRoot);
  const expoUsername =
    process.env.EAS_BUILD_USERNAME || (await UserManager.getCurrentUsernameAsync());

  let { exp: config } = getConfigWithMods(projectRoot, { skipSDKVersionRequirement: true });

  // Add all built-in plugins
  config = withExpoAndroidPlugins(config, {
    package: packageName,
    expoUsername,
  });

  // compile all plugins and mods
  await compileModsAsync(config, projectRoot);

  // Legacy -- TODO: Replace with plugins
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

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
  // await AndroidConfig.Facebook.setFacebookAppIdString(exp, projectRoot);
  // await AndroidConfig.Name.setName(exp, projectRoot);

  // add google-services.json to project
  await AndroidConfig.GoogleServices.setGoogleServicesFile(exp, projectRoot);

  // TODOs
  await AndroidConfig.SplashScreen.setSplashScreenAsync(exp, projectRoot);
  await AndroidConfig.Icon.setIconAsync(exp, projectRoot);
}
