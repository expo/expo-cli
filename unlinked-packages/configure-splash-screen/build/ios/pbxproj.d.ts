import { XcodeProject, UUID, PBXNativeTarget } from 'xcode';
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
  applicationNativeTarget: {
    uuid: UUID;
    target: PBXNativeTarget;
  };
}
/**
 * Reads iOS project and locates `.pbxproj` file for further parsing and modifications.
 */
export default function readPbxProject(projectRootPath: string): Promise<IosProject>;
