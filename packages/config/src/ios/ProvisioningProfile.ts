import fs from 'fs-extra';

import {
  ConfigurationSectionEntry,
  ProjectSectionEntry,
  getPbxproj,
  getProjectSection,
  getXCBuildConfigurationSection,
  getXCConfigurationLists,
  isBuildConfig,
  isNotComment,
  isNotTestHost,
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

  const configurationLists = getXCConfigurationLists(project);
  // TODO(dsokal): figure out if configuring only the entries from the first configuration list is fine
  const buildConfigurations = configurationLists[0].buildConfigurations.map(i => i.value);

  Object.entries(getXCBuildConfigurationSection(project))
    .filter(isNotComment)
    .filter(isBuildConfig)
    .filter(isNotTestHost)
    .filter(([, item]: ConfigurationSectionEntry) => item.buildSettings.PRODUCT_NAME)
    .filter(([key]: ConfigurationSectionEntry) => buildConfigurations.includes(key))
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
