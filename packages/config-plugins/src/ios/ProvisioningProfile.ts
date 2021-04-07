import fs from 'fs-extra';

import {
  ConfigurationSectionEntry,
  findFirstNativeTarget,
  findNativeTargetByName,
  getBuildConfigurationForId,
  getPbxproj,
  getProjectSection,
  isNotComment,
  ProjectSectionEntry,
} from './utils/Xcodeproj';

type ProvisioningProfileSettings = {
  targetName?: string;
  appleTeamId: string;
  profileName: string;
};

function setProvisioningProfileForPbxproj(
  projectRoot: string,
  { targetName, profileName, appleTeamId }: ProvisioningProfileSettings
): void {
  const project = getPbxproj(projectRoot);
  const target = targetName
    ? findNativeTargetByName(project, targetName)
    : findFirstNativeTarget(project);

  if (!target && targetName) {
    throw new Error(`Unable to find a target named ${targetName}.`);
  } else if (!target) {
    throw new Error(`Unable to find any targets in this Xcode project.`);
  }

  const [nativeTargetId, nativeTarget] = target;

  getBuildConfigurationForId(project, nativeTarget.buildConfigurationList)
    .filter(([, item]: ConfigurationSectionEntry) => item.buildSettings.PRODUCT_NAME)
    .forEach(([, item]: ConfigurationSectionEntry) => {
      item.buildSettings.PROVISIONING_PROFILE_SPECIFIER = `"${profileName}"`;
      item.buildSettings.DEVELOPMENT_TEAM = appleTeamId;
      item.buildSettings.CODE_SIGN_IDENTITY = '"iPhone Distribution"';
      item.buildSettings.CODE_SIGN_STYLE = 'Manual';
    });

  Object.entries(getProjectSection(project))
    .filter(isNotComment)
    .forEach(([, item]: ProjectSectionEntry) => {
      item.attributes.TargetAttributes[nativeTargetId].DevelopmentTeam = appleTeamId;
      item.attributes.TargetAttributes[nativeTargetId].ProvisioningStyle = 'Manual';
    });

  fs.writeFileSync(project.filepath, project.writeSync());
}

export { setProvisioningProfileForPbxproj };
