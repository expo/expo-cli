import { projectConfig } from '@react-native-community/cli-platform-ios';
import path from 'path';
import xcode, { XcodeProject, UUID, PBXNativeTarget } from 'xcode';

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

/**
 * Reads iOS project and locates `.pbxproj` file for further parsing and modifications.
 */
export default async function readPbxProject(projectRootPath: string): Promise<IosProject> {
  const config = projectConfig(projectRootPath, { plist: [] });

  if (!config) {
    throw new Error(`Couldn't find iOS project. Cannot configure iOS.`);
  }

  const { projectPath: xcodeProjPath, pbxprojPath } = config;

  // xcodeProjPath contains path to .xcodeproj directory
  if (!xcodeProjPath.endsWith('.xcodeproj')) {
    throw new Error(`Couldn't find .xcodeproj directory.`);
  }
  const projectPath = xcodeProjPath.substring(0, xcodeProjPath.length - '.xcodeproj'.length);
  const projectName = path.basename(projectPath);

  const pbxProject = xcode.project(pbxprojPath);

  await new Promise(resolve =>
    pbxProject.parse(err => {
      if (err) {
        throw new Error(`.pbxproj file parsing issue: ${err.message}.`);
      }
      resolve();
    })
  );

  const applicationNativeTarget = pbxProject.getTarget('com.apple.product-type.application');
  if (!applicationNativeTarget) {
    throw new Error(`Couldn't locate application PBXNativeTarget in '.xcodeproj' file.`);
  }

  if (String(applicationNativeTarget.target.name) !== projectName) {
    throw new Error(
      `Application native target name mismatch. Expected ${projectName}, but found ${applicationNativeTarget.target.name}.`
    );
  }

  // PBXVariantGroup may not exist in bare project, but is required by xcode package
  if (!pbxProject.hash.project.objects.PBXVariantGroup) {
    pbxProject.hash.project.objects.PBXVariantGroup = {};
  }

  return {
    projectName,
    projectPath,
    pbxProject,
    applicationNativeTarget,
  };
}
