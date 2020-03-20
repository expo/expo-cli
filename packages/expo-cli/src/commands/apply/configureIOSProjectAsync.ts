import { IosPlist } from '@expo/xdl';
import { IOSConfig, getConfig } from '@expo/config';
import path from 'path';

// TODO: it's silly and kind of fragile that we look at app config to determine the
// ios project paths
// * Overall this function needs to be revamped, just a placeholder for now!
function getIOSPaths(projectRoot: string) {
  let iosProjectDirectory;

  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  let projectName = exp.name;
  if (!projectName) {
    throw new Error('Need a name ;O');
  }

  iosProjectDirectory = path.join(projectRoot, 'ios', projectName);

  return {
    projectName,
    iosProjectDirectory,
  };
}

export default async function configureIOSProjectAsync(projectRoot: string) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectRoot, exp.ios!.bundleIdentifier!);
  const { iosProjectDirectory } = getIOSPaths(projectRoot);
  await IosPlist.modifyAsync(iosProjectDirectory, 'Info', infoPlist => {
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

  // log.newLine();
}
