import { ExpoConfig } from '@expo/config-types';
import fs from 'fs-extra';
import path from 'path';
import { XcodeProject } from 'xcode';

import { ConfigPlugin } from '../Plugin.types';
import { createInfoPlistPlugin, withXcodeProject } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';
import { getSourceRoot } from './Paths';
import { appendScheme } from './Scheme';
import { addResourceFileToGroup, getProjectName } from './utils/Xcodeproj';

export const withGoogle = createInfoPlistPlugin(setGoogleConfig, 'withGoogle');

export const withGoogleServicesFile: ConfigPlugin = config => {
  return withXcodeProject(config, config => {
    config.modResults = setGoogleServicesFile(config, {
      projectRoot: config.modRequest.projectRoot,
      project: config.modResults,
    });
    return config;
  });
};

export function getGoogleSignInReservedClientId(config: Pick<ExpoConfig, 'ios'>) {
  return config.ios?.config?.googleSignIn?.reservedClientId ?? null;
}

export function getGoogleServicesFile(config: Pick<ExpoConfig, 'ios'>) {
  return config.ios?.googleServicesFile ?? null;
}

export function setGoogleSignInReservedClientId(
  config: Pick<ExpoConfig, 'ios'>,
  infoPlist: InfoPlist
): InfoPlist {
  const reservedClientId = getGoogleSignInReservedClientId(config);

  if (reservedClientId === null) {
    return infoPlist;
  }

  return appendScheme(reservedClientId, infoPlist);
}

export function setGoogleConfig(config: Pick<ExpoConfig, 'ios'>, infoPlist: InfoPlist): InfoPlist {
  infoPlist = setGoogleSignInReservedClientId(config, infoPlist);
  return infoPlist;
}

export function setGoogleServicesFile(
  config: Pick<ExpoConfig, 'ios'>,
  { projectRoot, project }: { project: XcodeProject; projectRoot: string }
): XcodeProject {
  const googleServicesFileRelativePath = getGoogleServicesFile(config);
  if (googleServicesFileRelativePath === null) {
    return project;
  }

  const googleServiceFilePath = path.resolve(projectRoot, googleServicesFileRelativePath);
  fs.copyFileSync(
    googleServiceFilePath,
    path.join(getSourceRoot(projectRoot), 'GoogleService-Info.plist')
  );

  const projectName = getProjectName(projectRoot);
  const plistFilePath = `${projectName}/GoogleService-Info.plist`;
  if (!project.hasFile(plistFilePath)) {
    project = addResourceFileToGroup({
      filepath: plistFilePath,
      groupName: projectName,
      project,
      isBuildFile: true,
      verbose: true,
    });
  }
  return project;
}
