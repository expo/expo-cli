import { ConfigPlugin, XcodeProject } from '../Plugin.types';
import { withXcodeProject } from '../plugins/ios-plugins';
import {
  ConfigurationSectionEntry,
  findFirstNativeTarget,
  findNativeTargetByName,
  getBuildConfigurationForId,
  getProjectSection,
  isNotComment,
  ProjectSectionEntry,
} from './utils/Xcodeproj';

// Pick Team ID, Bundle ID, Device UDID
// Xcode Managed Profile -- iOS App Development profile

export type CodeSigningSettings = {
  targetName?: string;
  appleTeamId: string;
  profileName?: string;
  isAutoSigning: boolean;
  isDevelopment: boolean;
};

export const withCodeSigning: ConfigPlugin<CodeSigningSettings> = (config, props) => {
  return withXcodeProject(config, config => {
    config.modResults = updateCodeSigningForPbxproj(config.modResults, props);
    return config;
  });
};

export function updateCodeSigningForPbxproj(
  project: XcodeProject,
  { targetName, profileName, isAutoSigning, isDevelopment, appleTeamId }: CodeSigningSettings
): XcodeProject {
  const [nativeTargetId, nativeTarget] = targetName
    ? findNativeTargetByName(project, targetName)
    : findFirstNativeTarget(project);

  const signStyle = isAutoSigning ? 'Automatic' : 'Manual';
  const codeSigningIdentity = isDevelopment ? 'iPhone Developer' : 'iPhone Distribution';
  getBuildConfigurationForId(project, nativeTarget.buildConfigurationList)
    .filter(([, item]: ConfigurationSectionEntry) => item.buildSettings.PRODUCT_NAME)
    .forEach(([, item]: ConfigurationSectionEntry) => {
      if (profileName) {
        item.buildSettings.PROVISIONING_PROFILE_SPECIFIER = `"${profileName}"`;
      } else {
        delete item.buildSettings.PROVISIONING_PROFILE_SPECIFIER;
      }
      item.buildSettings.DEVELOPMENT_TEAM = appleTeamId;
      item.buildSettings.CODE_SIGN_IDENTITY = `"${codeSigningIdentity}"`;
      item.buildSettings.CODE_SIGN_STYLE = signStyle;
    });

  Object.entries(getProjectSection(project))
    .filter(isNotComment)
    .forEach(([, item]: ProjectSectionEntry) => {
      item.attributes.TargetAttributes[nativeTargetId].DevelopmentTeam = appleTeamId;
      item.attributes.TargetAttributes[nativeTargetId].ProvisioningStyle = signStyle;
    });

  return project;
}
