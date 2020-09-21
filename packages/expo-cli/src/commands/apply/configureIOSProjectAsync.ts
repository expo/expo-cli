import { getConfig, IOSConfig, WarningAggregator } from '@expo/config';
import { getPbxproj, getProjectName } from '@expo/config/build/ios/utils/Xcodeproj';
import { withPlugins } from '@expo/config/build/plugins/withPlugins';
import { IosPlist, UserManager } from '@expo/xdl';
import fs from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import { getOrPromptForBundleIdentifier } from '../eject/ConfigValidation';
import { commitFilesAsync, getFileSystemIosAsync } from './configureFileSystem';

export default async function configureIOSProjectAsync(projectRoot: string) {
  const projectFileSystem = await getFileSystemIosAsync(projectRoot);

  // Check bundle ID before reading the config because it may mutate the config if the user is prompted to define it.
  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);
  IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectRoot, bundleIdentifier);

  const originalConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const { expo: exp, pack } = withPlugins(
    [
      IOSConfig.Icons.withIcons,
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

      // Entitlements
      IOSConfig.Entitlements.withAppleSignInEntitlement,
      IOSConfig.Entitlements.withAccessesContactNotes,
      IOSConfig.Entitlements.withAssociatedDomains,

      // XcodeProject
      IOSConfig.DeviceFamily.withDeviceFamily,
      IOSConfig.Locales.withLocales,
    ],
    {
      pack: originalConfig.pack,
      expo: originalConfig.exp,
    }
  );

  // IOSConfig.Google.setGoogleServicesFile(exp, projectRoot);
  // IOSConfig.DeviceFamily.setDeviceFamily(exp, projectRoot);
  // await IOSConfig.Locales.setLocalesAsync(exp, projectRoot);

  // Configure the Info.plist
  if (typeof pack?.ios?.xcodeproj === 'function') {
    await modifyPbxprojAsync(projectRoot, async project => {
      if (typeof pack?.ios?.xcodeproj === 'function') {
        project = (
          await pack.ios.xcodeproj({
            ...projectFileSystem,
            projectName,
            data: project,
          })
        ).data!;
      }
      return project;
    });
  }

  // Configure the Info.plist
  await modifyInfoPlistAsync(projectRoot, async infoPlist => {
    infoPlist = IOSConfig.CustomInfoPlistEntries.setCustomInfoPlistEntries(exp, infoPlist);
    // if (typeof pack?.ios?.info === 'function') {
    //   infoPlist = (
    //     await pack.ios.info({
    //       projectRoot,
    //       projectName,
    //       data: infoPlist,
    //       // filePath,
    //       files,
    //     })
    //   ).data!;
    // }
    return infoPlist;
  });

  // Configure Expo.plist
  await modifyExpoPlistAsync(projectRoot, async expoPlist => {
    const username = await UserManager.getCurrentUsernameAsync();
    expoPlist = IOSConfig.Updates.setUpdatesConfig(exp, expoPlist, username);
    return expoPlist;
  });

  // TODO: fix this on Windows! We will ignore errors for now so people can just proceed
  try {
    // Configure entitlements/capabilities
    await modifyEntitlementsPlistAsync(projectRoot, async plist => {
      // TODO: We don't have a mechanism for getting the apple team id here yet
      plist = IOSConfig.Entitlements.setICloudEntitlement(exp, 'TODO-GET-APPLE-TEAM-ID', plist);
      if (typeof pack?.ios?.entitlements === 'function') {
        plist = (
          await pack.ios.entitlements({
            ...projectFileSystem,
            projectName,
            data: plist,
          })
        ).data!;
      }

      return plist;
    });
  } catch (e) {
    WarningAggregator.addWarningIOS(
      'entitlements',
      'iOS entitlements could not be applied. Please ensure that contact notes, Apple Sign In, and associated domains entitlements are properly configured if you use them in your app.'
    );
  }

  // Other
  // await IOSConfig.Icons.setIconsAsync(exp, projectRoot);
  await IOSConfig.SplashScreen.setSplashScreenAsync(exp, projectRoot);
  const projectName = getProjectName(projectRoot);

  await pack?.ios?.after?.({
    // data: androidManifest,
    // filePath,
    ...projectFileSystem,
    projectRoot,
  });

  await commitFilesAsync(projectFileSystem);
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

async function modifyPbxprojAsync(
  projectRoot: string,
  callback: (project: XcodeProject) => Promise<XcodeProject>
) {
  const project = getPbxproj(projectRoot);
  const result = await callback(project);
  fs.writeFileSync(project.filepath, result.writeSync());
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
