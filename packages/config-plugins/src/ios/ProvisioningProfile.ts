import fs from 'fs-extra';

import {
  ConfigurationSectionEntry,
  findFirstNativeTarget,
  getBuildConfigurationForId,
  getPbxproj,
  getProjectSection,
  isNotComment,
  ProjectSectionEntry,
} from './utils/Xcodeproj';

type ProvisioningProfileSettings = {
  appleTeamId: string;
  profileName: string;
};

function setProvisioningProfileForPbxproj(
  projectRoot: string,
  { profileName, appleTeamId }: ProvisioningProfileSettings
): void {
  const project = getPbxproj(projectRoot);
  const nativeTarget = findFirstNativeTarget(project);

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
      // TODO(dsokal): figure out if we need to configure anything else than the first target
      const targetId = item.targets[0].value;
      item.attributes.TargetAttributes[targetId].DevelopmentTeam = appleTeamId;
      item.attributes.TargetAttributes[targetId].ProvisioningStyle = 'Manual';
    });

  fs.writeFileSync(project.filepath, project.writeSync());
}

export { setProvisioningProfileForPbxproj };
