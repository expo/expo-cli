import { getConfig, IOSConfig, WarningAggregator } from '@expo/config';
import { ConfigPlugin, ExportedConfig } from '@expo/config/build/Config.types';
import { getProjectName } from '@expo/config/build/ios/utils/Xcodeproj';
import { withPlugins } from '@expo/config/build/plugins/core-plugins';
import { IosPlist, UserManager } from '@expo/xdl';
import path from 'path';

import { getOrPromptForBundleIdentifier } from '../eject/ConfigValidation';

export default async function configureIOSProjectAsync(projectRoot: string) {
  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectRoot, bundleIdentifier);
  const expoUsername = await UserManager.getCurrentUsernameAsync();

  //// New System
  // Add all built-in plugins
  const { expo, plugins } = withExpoPlugins(getExportedConfig(projectRoot), {
    projectRoot,
    bundleIdentifier,
    expoUsername,
  });

  await compileIOSPluginsAsync(projectRoot, { expo, plugins });

  //// Current System
  // TODO: Convert all of this to config plugins

  IOSConfig.Google.setGoogleServicesFile(expo, projectRoot);

  // TODO: fix this on Windows! We will ignore errors for now so people can just proceed
  try {
    // Configure entitlements/capabilities
    await modifyEntitlementsPlistAsync(projectRoot, entitlementsPlist => {
      entitlementsPlist = IOSConfig.Entitlements.setCustomEntitlementsEntries(
        expo,
        entitlementsPlist
      );
      return entitlementsPlist;
    });
  } catch (e) {
    WarningAggregator.addWarningIOS(
      'entitlements',
      'iOS entitlements could not be applied. Please ensure that contact notes, Apple Sign In, and associated domains entitlements are properly configured if you use them in your app.'
    );
  }

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
    [withExistingInfoPlist, projectRoot],
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

/**
 * Plugin to apply the current contents of the project's Info.plist to the Expo config ios.infoPlist object.
 * TODO: In the future this should go away in favor of just overwriting the Info.plist every time.
 */
const withExistingInfoPlist: ConfigPlugin<string> = (config, projectRoot) => {
  const { iosProjectDirectory } = getIOSPaths(projectRoot);
  const contents = IosPlist.read(iosProjectDirectory, 'Info');

  if (!config.expo.ios) {
    config.expo.ios = {};
  }
  if (!config.expo.ios.infoPlist) {
    config.expo.ios.infoPlist = {};
  }

  config.expo.ios.infoPlist = {
    ...(contents || {}),
    ...config.expo.ios.infoPlist,
  };

  return config;
};

//// Compiler

async function compileIOSPluginsAsync(
  projectRoot: string,
  { expo, plugins }: ExportedConfig
): Promise<void> {
  const projectFileSystem = {
    projectRoot,
    platformProjectRoot: path.join(projectRoot, 'ios'),
    projectName: getProjectName(projectRoot),
  };

  // Configure the Info.plist
  await modifyInfoPlistAsync(projectRoot, async data => {
    data =
      expo.ios?.infoPlist || IOSConfig.CustomInfoPlistEntries.setCustomInfoPlistEntries(expo, data);
    return data;
  });

  // Configure Expo.plist
  await modifyExpoPlistAsync(projectRoot, async data => {
    if (typeof plugins?.ios?.expoPlist === 'function') {
      data = (
        await plugins.ios.expoPlist({
          ...projectFileSystem,
          data,
        })
      ).data;
    }
    return data;
  });

  // TODO: fix this on Windows! We will ignore errors for now so people can just proceed
  try {
    // Configure entitlements/capabilities
    await modifyEntitlementsPlistAsync(projectRoot, async data => {
      if (typeof plugins?.ios?.entitlements === 'function') {
        data = (
          await plugins.ios.entitlements({
            ...projectFileSystem,
            data,
          })
        ).data;
      }
      return data;
    });
  } catch (e) {
    WarningAggregator.addWarningIOS(
      'entitlements',
      'iOS entitlements could not be applied. Please ensure that contact notes, Apple Sign In, and associated domains entitlements are properly configured if you use them in your app.'
    );
  }

  // Run all post plugins
  await plugins?.ios?.file?.({
    ...projectFileSystem,
  });
}

function getExportedConfig(projectRoot: string): ExportedConfig {
  const originalConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return { expo: originalConfig.exp, plugins: originalConfig.plugins };
}

async function modifyEntitlementsPlistAsync(projectRoot: string, callback: (plist: any) => any) {
  const entitlementsPath = IOSConfig.Entitlements.getEntitlementsPath(projectRoot);
  const directory = path.dirname(entitlementsPath);
  const filename = path.basename(entitlementsPath, 'plist');
  await IosPlist.modifyAsync(directory, filename, callback);
  await IosPlist.cleanBackupAsync(directory, filename, false);
}

async function modifyInfoPlistAsync(projectRoot: string, callback: (plist: any) => any) {
  const { iosProjectDirectory } = getIOSPaths(projectRoot);
  await IosPlist.modifyAsync(iosProjectDirectory, 'Info', callback);
  await IosPlist.cleanBackupAsync(iosProjectDirectory, 'Info', false);
}

async function modifyExpoPlistAsync(projectRoot: string, callback: (plist: any) => any) {
  const { iosProjectDirectory } = getIOSPaths(projectRoot);
  const supportingDirectory = path.join(iosProjectDirectory, 'Supporting');
  try {
    await IosPlist.modifyAsync(supportingDirectory, 'Expo', callback);
  } catch (error) {
    WarningAggregator.addWarningIOS(
      'updates',
      'Expo.plist configuration could not be applied. You will need to create Expo.plist if it does not exist and add Updates configuration manually.',
      'https://docs.expo.io/bare/updating-your-app/#configuration-options'
    );
  } finally {
    await IosPlist.cleanBackupAsync(supportingDirectory, 'Expo', false);
  }
}

// TODO: come up with a better solution for using app.json expo.name in various places
function sanitizedName(name: string) {
  return name
    .replace(/[\W_]+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// TODO: it's silly and kind of fragile that we look at app config to determine
// the ios project paths. Overall this function needs to be revamped, just a
// placeholder for now! Make this more robust when we support applying config
// at any time (currently it's only applied on eject).
function getIOSPaths(projectRoot: string) {
  let projectName: string | null = null;

  // Attempt to get the current ios folder name (apply).
  try {
    projectName = getProjectName(projectRoot);
  } catch {
    // If no iOS project exists then create a new one (eject).
    const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

    projectName = exp.name;
    if (!projectName) {
      throw new Error('Your project needs a name in app.json/app.config.js.');
    }
    projectName = sanitizedName(projectName);
  }

  const iosProjectDirectory = path.join(projectRoot, 'ios', projectName);
  const iconPath = path.join(iosProjectDirectory, 'Assets.xcassets', 'AppIcon.appiconset');

  return {
    projectName,
    iosProjectDirectory,
    iconPath,
  };
}
