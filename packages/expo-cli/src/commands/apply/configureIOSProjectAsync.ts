import { IosPlist } from '@expo/xdl';
import { IOSConfig, getConfig } from '@expo/config';
import path from 'path';
import fs from 'fs-extra';

// TODO: it's silly and kind of fragile that we look at app config to determine the
// ios project paths
// * Overall this function needs to be revamped, just a placeholder for now!
function getIOSPaths(projectRoot: string) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  let projectName = exp.name;
  if (!projectName) {
    throw new Error('Need a name ;O');
  }

  const iosProjectDirectory = path.join(projectRoot, 'ios', projectName);
  const iconPath = path.join(iosProjectDirectory, 'Assets.xcassets', 'AppIcon.appiconset');

  return {
    projectName,
    iosProjectDirectory,
    iconPath,
  };
}

function modifyEntitlementsPlistAsync(projectRoot: string, callback: (plist: any) => any) {
  let entitlementsPath = IOSConfig.Entitlements.getEntitlementsPath(projectRoot);
  let directory = path.dirname(entitlementsPath);
  let filename = path.basename(entitlementsPath, 'plist');
  return IosPlist.modifyAsync(directory, filename, callback);
}

function modifyInfoPlistAsync(projectRoot: string, callback: (plist: any) => any) {
  const { iosProjectDirectory } = getIOSPaths(projectRoot);
  return IosPlist.modifyAsync(iosProjectDirectory, 'Info', callback);
}

export default async function configureIOSProjectAsync(projectRoot: string) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectRoot, exp.ios!.bundleIdentifier!);

  // Configure the Info.plist
  await modifyInfoPlistAsync(projectRoot, infoPlist => {
    infoPlist = IOSConfig.CustomInfoPlistEntries.setCustomInfoPlistEntries(exp, infoPlist);
    infoPlist = IOSConfig.Name.setDisplayName(exp, infoPlist);
    infoPlist = IOSConfig.Scheme.setScheme(exp, infoPlist);
    infoPlist = IOSConfig.Version.setVersion(exp, infoPlist);
    infoPlist = IOSConfig.Version.setBuildNumber(exp, infoPlist);
    infoPlist = IOSConfig.DeviceFamily.setDeviceFamily(exp, infoPlist);
    infoPlist = IOSConfig.RequiresFullScreen.setRequiresFullScreen(exp, infoPlist);
    infoPlist = IOSConfig.UserInterfaceStyle.setUserInterfaceStyle(exp, infoPlist);
    infoPlist = IOSConfig.Branch.setBranchApiKey(exp, infoPlist);
    infoPlist = IOSConfig.UsesNonExemptEncryption.setUsesNonExemptEncryption(exp, infoPlist);
    return infoPlist;
  });

  // Configure entitlements/capabilities
  await modifyEntitlementsPlistAsync(projectRoot, entitlementsPlist => {
    // IOSConfig.Entitlements.setICloudEntitlement(exp, 'TODO-GET-APPLE-TEAM-ID', projectRoot);
    entitlementsPlist = IOSConfig.Entitlements.setAppleSignInEntitlement(exp, entitlementsPlist);
    return entitlementsPlist;
  });
}
