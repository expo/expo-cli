import * as path from 'path';
import xcode, { PBXNativeTarget, UUID, XcodeProject } from 'xcode';

import {
  getAllPBXProjectPaths,
  getAllXcodeProjectPaths,
  getApplicationNativeTarget,
} from './Paths';

export interface IosProject {
  projectName: string;
  /**
   * Root path to directory containing project source files.
   */
  projectPath: string;
  /**
   * pbxProject reference that allows to modify `.pbxproj` file.
   */
  pbxProject: XcodeProject;
  /**
   * main application PBXNativeTarget from `.pbxproj` file.
   */
  applicationNativeTarget: { uuid: UUID; target: PBXNativeTarget };
}

function getProjectConfig(projectRoot: string): { projectPath: string; pbxprojPath: string } {
  return {
    projectPath: getAllXcodeProjectPaths(projectRoot)[0]!,
    pbxprojPath: getAllPBXProjectPaths(projectRoot)[0]!,
  };
}

/**
 * Reads iOS project and locates `.pbxproj` file for further parsing and modifications.
 */
export default async function readPbxProject(projectRootPath: string): Promise<IosProject> {
  const config = getProjectConfig(projectRootPath);

  const { projectPath: xcodeProjPath, pbxprojPath } = config;

  const projectPath = xcodeProjPath.substring(0, xcodeProjPath.length - '.xcodeproj'.length);
  const projectName = path.basename(projectPath);

  const pbxProject = xcode.project(pbxprojPath);

  await new Promise<void>(resolve =>
    pbxProject.parse(err => {
      if (err) {
        throw new Error(`.pbxproj file parsing issue: ${err.message}.`);
      }
      resolve();
    })
  );

  const applicationNativeTarget = getApplicationNativeTarget({ project: pbxProject, projectName });

  return {
    projectName,
    projectPath,
    pbxProject,
    applicationNativeTarget,
  };
}
