import { ConfigPlugin, ExportedConfig, getConfig, IOSConfig } from '@expo/config/build/index';
import { withPlugins } from '@expo/config/build/plugins/core-plugins';
import { compilePluginsAsync } from '@expo/config/build/plugins/plugin-compiler';
import { UserManager } from '@expo/xdl';

import { getOrPromptForBundleIdentifier } from '../eject/ConfigValidation';

export default async function configureIOSProjectAsync(projectRoot: string) {
  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectRoot, bundleIdentifier);
  const expoUsername = await UserManager.getCurrentUsernameAsync();

  //// New System
  let config = getExportedConfig(projectRoot);

  // Add all built-in plugins
  config = withExpoPlugins(config, {
    projectRoot,
    bundleIdentifier,
    expoUsername,
  });

  // compile all plugins and modifiers
  const { expo } = await compilePluginsAsync(projectRoot, config);

  //// Current System
  // TODO: Convert all of this to config plugins

  IOSConfig.Google.setGoogleServicesFile(expo, projectRoot);

  // Other
  await IOSConfig.Icons.setIconsAsync(expo, projectRoot);
  await IOSConfig.SplashScreen.setSplashScreenAsync(expo, projectRoot);
  await IOSConfig.Locales.setLocalesAsync(expo, projectRoot);
  IOSConfig.DeviceFamily.setDeviceFamily(expo, projectRoot);
}

/**
 * Config plugin to apply all of the custom Expo config plugins we support by default.
 * TODO: In the future most of this should go into versioned packages like expo-facebook, expo-updates, etc...
 */
const withExpoPlugins: ConfigPlugin<{
  projectRoot: string;
  bundleIdentifier: string;
  expoUsername: string | null;
}> = (config, { projectRoot, expoUsername }) => {
  return withPlugins(config, [
    // [withExistingInfoPlist, projectRoot],
    // [IOSConfig.BundleIdenitifer.withBundleIdentifierInPbxproj, { bundleIdentifier }],
    // IOSConfig.Icons.withIcons,
    IOSConfig.Branch.withBranch,
    IOSConfig.Facebook.withFacebook,
    IOSConfig.Google.withGoogle,
    IOSConfig.Name.withDisplayName,
    // IOSConfig.Name.withName,
    IOSConfig.Orientation.withOrientation,
    IOSConfig.RequiresFullScreen.withRequiresFullScreen,
    IOSConfig.Scheme.withScheme,
    IOSConfig.UserInterfaceStyle.withUserInterfaceStyle,
    IOSConfig.UsesNonExemptEncryption.withUsesNonExemptEncryption,
    IOSConfig.Version.withBuildNumber,
    IOSConfig.Version.withVersion,
    // IOSConfig.Google.withGoogleServicesFile,
    [IOSConfig.Updates.withUpdates, { expoUsername }],
    // Entitlements
    IOSConfig.Entitlements.withAppleSignInEntitlement,
    IOSConfig.Entitlements.withAccessesContactNotes,
    // TODO: We don't have a mechanism for getting the apple team id here yet
    [IOSConfig.Entitlements.withICloudEntitlement, { appleTeamId: 'TODO-GET-APPLE-TEAM-ID' }],
    IOSConfig.Entitlements.withAssociatedDomains,
    // XcodeProject
    //  IOSConfig.DeviceFamily.withDeviceFamily,
    //  IOSConfig.Locales.withLocales,
  ]);
};

function getExportedConfig(projectRoot: string): ExportedConfig {
  const originalConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return { expo: originalConfig.exp, plugins: originalConfig.plugins };
}
