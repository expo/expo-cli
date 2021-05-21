import fs from 'fs-extra';

import { findFirstNativeTarget, findNativeTargetByName } from './Target';
import {
  ConfigurationSectionEntry,
  getBuildConfigurationsForListId,
  getPbxproj,
  getProjectSection,
  isNotComment,
  ProjectSectionEntry,
} from './utils/Xcodeproj';

type ProvisioningProfileSettings = {
  targetName?: string;
  appleTeamId: string;
  profileName: string;
  buildConfiguration?: string;
};

export function setProvisioningProfileForPbxproj(
  projectRoot: string,
  {
    targetName,
    profileName,
    appleTeamId,
    buildConfiguration = 'Release',
  }: ProvisioningProfileSettings
): void {
  const project = getPbxproj(projectRoot);

  const nativeTargetEntry = targetName
    ? findNativeTargetByName(project, targetName)
    : findFirstNativeTarget(project);
  const [nativeTargetId, nativeTarget] = nativeTargetEntry;

  getBuildConfigurationsForListId(project, nativeTarget.buildConfigurationList)
    .filter(([, item]: ConfigurationSectionEntry) => item.name === buildConfiguration)
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
