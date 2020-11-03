import { ConfigPlugin } from '../Plugin.types';
import * as AndroidConfig from '../android';
import * as IOSConfig from '../ios';
import { withPlugins } from './core-plugins';

/**
 * Config plugin to apply all of the custom Expo iOS config plugins we support by default.
 * TODO: In the future most of this should go into versioned packages like expo-facebook, expo-updates, etc...
 */
export const withExpoIOSPlugins: ConfigPlugin<{
  bundleIdentifier: string;
  expoUsername: string | null;
}> = (config, { bundleIdentifier, expoUsername }) => {
  // Set the bundle ID ahead of time.
  if (!config.ios) config.ios = {};
  config.ios.bundleIdentifier = bundleIdentifier;

  return withPlugins(config, [
    [IOSConfig.BundleIdenitifer.withBundleIdentifier, { bundleIdentifier }],
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
    IOSConfig.Google.withGoogleServicesFile,
    [IOSConfig.Updates.withUpdates, { expoUsername }],
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
    IOSConfig.SplashScreen.withSplashScreen,
  ]);
};

/**
 * Config plugin to apply all of the custom Expo Android config plugins we support by default.
 * TODO: In the future most of this should go into versioned packages like expo-facebook, expo-updates, etc...
 */
export const withExpoAndroidPlugins: ConfigPlugin<{
  package: string;
  expoUsername: string | null;
}> = (config, { expoUsername, ...props }) => {
  // Set the package name ahead of time.
  if (!config.android) config.android = {};
  config.android.package = props.package;

  return withPlugins(config, [
    // strings.xml
    AndroidConfig.Name.withName,
    AndroidConfig.Facebook.withFacebookAppIdString,

    // build.gradle

    // app/build.gradle

    // AndroidManifest.xml
    AndroidConfig.Package.withPackageManifest,
    AndroidConfig.AllowBackup.withAllowBackup,
    AndroidConfig.Scheme.withScheme,
    AndroidConfig.Orientation.withOrientation,
    AndroidConfig.Permissions.withPermissions,
    AndroidConfig.Branch.withBranch,
    AndroidConfig.Facebook.withFacebookManifest,

    AndroidConfig.UserInterfaceStyle.withUiModeManifest,
    AndroidConfig.GoogleMobileAds.withGoogleMobileAdsConfig,
    AndroidConfig.GoogleMapsApiKey.withGoogleMapsApiKey,
    AndroidConfig.IntentFilters.withAndroidIntentFilters,
    [AndroidConfig.Updates.withUpdates, { expoUsername }],

    // MainActivity.*
  ]);
};
