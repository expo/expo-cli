import path from 'path';
import { XcodeProject } from 'xcode';

import { getXCBuildConfigurationFromPbxproj } from './Target';
import { resolvePathOrProject } from './utils/Xcodeproj';

/**
 * Find the Info.plist path linked to a specific build configuration.
 *
 * @param projectRoot
 * @param param1
 * @returns
 */
export function getInfoPlistPathFromPbxproj(
  projectRootOrProject: string | XcodeProject,
  {
    targetName,
    buildConfiguration = 'Release',
  }: { targetName?: string; buildConfiguration?: string } = {}
): string | null {
  const project = resolvePathOrProject(projectRootOrProject);

  const xcBuildConfiguration = getXCBuildConfigurationFromPbxproj(project, {
    targetName,
    buildConfiguration,
  });
  if (!xcBuildConfiguration) {
    return null;
  }
  const infoPlist = xcBuildConfiguration.buildSettings.INFOPLIST_FILE;
  if (!infoPlist) {
    return null;
  }
  // The `INFOPLIST_FILE` is relative to the project folder, ex: app/Info.plist.
  const xcodeProjectParentFolder = path.dirname(findUpPbxprojRoot(project.filepath));

  const infoPlistPath = path.join(xcodeProjectParentFolder, infoPlist);
  return infoPlistPath;
}

function findUpPbxprojRoot(projPath: string) {
  let root = projPath;

  while (root.length > 2 && path.extname(root) !== '.xcodeproj') {
    root = path.dirname(root);
  }
  return root;
}
