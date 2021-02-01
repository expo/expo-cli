/**
 * These are the versioned first-party plugins with some of the future third-party plugins mixed in for legacy support.
 */
import { ConfigPlugin } from '../Plugin.types';
import * as AndroidConfig from '../android';
import * as IOSConfig from '../ios';
import { withPlugins } from './core-plugins';
import withAdMob from './unversioned/expo-ads-admob';
import withBranch from './unversioned/expo-branch';
import withFacebook from './unversioned/expo-facebook';
import withNotifications from './unversioned/expo-notifications';
import withSplashScreen from './unversioned/expo-splash-screen';
import withUpdates from './unversioned/expo-updates';

/**
 * Config plugin to apply all of the custom Expo iOS config plugins we support by default.
 * TODO: In the future most of this should go into versioned packages like expo-facebook, expo-updates, etc...
 */
export const withExpoIOSPlugins: ConfigPlugin<{
  bundleIdentifier: string;
}> = (config, { bundleIdentifier }) => {
  // Set the bundle ID ahead of time.
  if (!config.ios) config.ios = {};
  config.ios.bundleIdentifier = bundleIdentifier;

  return withPlugins(config, [
    [IOSConfig.BundleIdentifier.withBundleIdentifier, { bundleIdentifier }],
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
    IOSConfig.Google.withGoogleServicesFile,
    // Entitlements
    IOSConfig.Entitlements.withAppleSignInEntitlement,
    IOSConfig.Entitlements.withAccessesContactNotes,
    // TODO: We don't have a mechanism for getting the apple team id here yet
    [IOSConfig.Entitlements.withICloudEntitlement, { appleTeamId: 'TODO-GET-APPLE-TEAM-ID' }],
    IOSConfig.Entitlements.withAssociatedDomains,
    // XcodeProject
    IOSConfig.DeviceFamily.withDeviceFamily,
    IOSConfig.Locales.withLocales,
    // Dangerous
    IOSConfig.Icons.withIcons,
  ]);
};

/**
 * Config plugin to apply all of the custom Expo Android config plugins we support by default.
 * TODO: In the future most of this should go into versioned packages like expo-facebook, expo-updates, etc...
 */
export const withExpoAndroidPlugins: ConfigPlugin<{
  package: string;
}> = (config, props) => {
  // Set the package name ahead of time.
  if (!config.android) config.android = {};
  config.android.package = props.package;

  return withPlugins(config, [
    // settings.gradle
    AndroidConfig.Name.withNameSettingsGradle,

    // project build.gradle
    AndroidConfig.GoogleServices.withClassPath,

    // app/build.gradle
    AndroidConfig.GoogleServices.withApplyPlugin,
    AndroidConfig.Package.withPackageGradle,
    AndroidConfig.Version.withVersion,

    // AndroidManifest.xml
    AndroidConfig.Package.withPackageManifest,
    AndroidConfig.AllowBackup.withAllowBackup,
    AndroidConfig.Scheme.withScheme,
    AndroidConfig.Orientation.withOrientation,
    AndroidConfig.Permissions.withPermissions,
    AndroidConfig.UserInterfaceStyle.withUiModeManifest,
    AndroidConfig.GoogleMapsApiKey.withGoogleMapsApiKey,
    AndroidConfig.IntentFilters.withAndroidIntentFilters,

    // MainActivity.*
    AndroidConfig.UserInterfaceStyle.withUiModeMainActivity,

    // strings.xml
    AndroidConfig.Name.withName,

    // Dangerous -- these plugins run in reverse order.
    AndroidConfig.GoogleServices.withGoogleServicesFile,

    // Modify colors.xml and styles.xml
    AndroidConfig.RootViewBackgroundColor.withRootViewBackgroundColor,
    AndroidConfig.NavigationBar.withNavigationBar,
    AndroidConfig.StatusBar.withStatusBar,
    AndroidConfig.PrimaryColor.withPrimaryColor,

    AndroidConfig.Icon.withIcons,
    // If we renamed the package, we should also move it around and rename it in source files
    // Added last to ensure this plugin runs first. Out of tree solutions will mistakenly resolve the package incorrectly otherwise.
    AndroidConfig.Package.withPackageRefactor,
  ]);
};

export const withExpoVersionedSDKPlugins: ConfigPlugin<{ expoUsername: string | null }> = (
  config,
  { expoUsername }
) => {
  return withPlugins(config, [
    withAdMob,
    withNotifications,
    [withUpdates, { expoUsername }],
    withBranch,
    withFacebook,
    withSplashScreen,
  ]);
};
