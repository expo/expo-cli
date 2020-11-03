import { AndroidConfig, getConfig, getConfigWithMods } from '@expo/config';
import { withExpoAndroidPlugins } from '@expo/config/build/plugins/expo-plugins';
import { compileModsAsync } from '@expo/config/build/plugins/mod-compiler';
import { UserManager } from '@expo/xdl';

import { getOrPromptForPackage } from '../eject/ConfigValidation';

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
