import { IOSConfig, WarningAggregator, getConfig } from '@expo/config';
import { getProjectName } from '@expo/config/build/ios/utils/Xcodeproj';
import { IosPlist, UserManager } from '@expo/xdl';
import path from 'path';

import { authenticate } from '../../appleApi';
import { getOrPromptForBundleIdentifier } from '../eject/ConfigValidation';

export default async function configureIOSProjectAsync(projectRoot: string) {
  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectRoot, bundleIdentifier);

  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const username = await UserManager.getCurrentUsernameAsync();

  IOSConfig.Google.setGoogleServicesFile(exp, projectRoot);
  IOSConfig.DeviceFamily.setDeviceFamily(exp, projectRoot);

  // Configure the Info.plist
  await modifyInfoPlistAsync(projectRoot, infoPlist => {
    infoPlist = IOSConfig.CustomInfoPlistEntries.setCustomInfoPlistEntries(exp, infoPlist);
    infoPlist = IOSConfig.Branch.setBranchApiKey(exp, infoPlist);
    infoPlist = IOSConfig.Facebook.setFacebookConfig(exp, infoPlist);
    infoPlist = IOSConfig.Google.setGoogleConfig(exp, infoPlist);
    infoPlist = IOSConfig.Name.setDisplayName(exp, infoPlist);
    infoPlist = IOSConfig.Orientation.setOrientation(exp, infoPlist);
    infoPlist = IOSConfig.RequiresFullScreen.setRequiresFullScreen(exp, infoPlist);
    infoPlist = IOSConfig.Scheme.setScheme(exp, infoPlist);
    infoPlist = IOSConfig.UserInterfaceStyle.setUserInterfaceStyle(exp, infoPlist);
    infoPlist = IOSConfig.UsesNonExemptEncryption.setUsesNonExemptEncryption(exp, infoPlist);
    infoPlist = IOSConfig.Version.setBuildNumber(exp, infoPlist);
    infoPlist = IOSConfig.Version.setVersion(exp, infoPlist);

    return infoPlist;
  });

  // Configure Expo.plist
  await modifyExpoPlistAsync(projectRoot, expoPlist => {
    expoPlist = IOSConfig.Updates.setUpdatesConfig(exp, expoPlist, username);
    return expoPlist;
  });

  // TODO: fix this on Windows! We will ignore errors for now so people can just proceed
  try {
    // Configure entitlements/capabilities
    await modifyEntitlementsPlistAsync(projectRoot, async entitlementsPlist => {
      let appleTeamId: string | null = null;
      if (exp.ios?.usesIcloudStorage) {
        appleTeamId = (await authenticate()).team.id;
      }
      // TODO: We don't have a mechanism for getting the apple team id here yet
      entitlementsPlist = IOSConfig.Entitlements.setICloudEntitlement(
        exp,
        bundleIdentifier,
        appleTeamId,
        entitlementsPlist
      );

      entitlementsPlist = IOSConfig.Entitlements.setAppleSignInEntitlement(exp, entitlementsPlist);
      entitlementsPlist = IOSConfig.Entitlements.setAccessesContactNotes(exp, entitlementsPlist);
      entitlementsPlist = IOSConfig.Entitlements.setAssociatedDomains(exp, entitlementsPlist);
      return entitlementsPlist;
    });
  } catch (e) {
    WarningAggregator.addWarningIOS(
      'entitlements',
      'iOS entitlements could not be applied. Please ensure that contact notes, Apple Sign In, and associated domains entitlements are properly configured if you use them in your app.'
    );
  }

  // Other
  await IOSConfig.Icons.setIconsAsync(exp, projectRoot);
  await IOSConfig.SplashScreen.setSplashScreenAsync(exp, projectRoot);
  await IOSConfig.Locales.setLocalesAsync(exp, projectRoot);
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
