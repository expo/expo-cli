// @ts-ignore
import { project as Project } from 'xcode';
// @ts-ignore
import pbxFile from 'xcode/lib/pbxFile';
import { sync as globSync } from 'glob';
import path from 'path';

export function getProjectName(projectRoot: string) {
  const sourceRoot = getSourceRoot(projectRoot);
  const sourceRootParts = sourceRoot.split(path.sep);
  return sourceRootParts[sourceRootParts.length - 1];
}

export function getSourceRoot(projectRoot: string) {
  const paths = globSync(path.join(projectRoot, 'ios', '*', 'AppDelegate.m'));
  return path.dirname(paths[0]);
}

// TODO(brentvatne): I couldn't figure out how to do this with an existing
// higher level function exposed by the xcode library, but we should find out how to do
// that and replace this with it
export function addFileToGroup(filepath: string, groupName: string, project: Project) {
  let file = new pbxFile(filepath);
  file.uuid = project.generateUuid();
  file.fileRef = project.generateUuid();
  project.addToPbxFileReferenceSection(file);
  project.addToPbxBuildFileSection(file);
  project.addToPbxSourcesBuildPhase(file);
  let group = project.pbxGroupByName(groupName);
  if (!group) {
    throw Error(`Group by name ${groupName} not found!`);
  }

  group.children.push({ value: file.fileRef, comment: file.basename });
  return project;
}

/**
 * Get the pbxproj for the given path
 */
export function getPbxproj(projectRoot: string) {
  const pbxprojPaths = globSync(path.join(projectRoot, 'ios', '*', 'project.pbxproj'));
  const [pbxprojPath, ...otherPbxprojPaths] = pbxprojPaths;

  if (pbxprojPaths.length > 1) {
    console.warn(
      `Found multiple pbxproject files paths, using ${pbxprojPath}. Other paths ${JSON.stringify(
        otherPbxprojPaths
      )} ignored.`
    );
  }

  const project = Project(pbxprojPath);
  project.parseSync();
  return project;
}

export function removeComments([item]: any[]): boolean {
  return !item.endsWith(`_comment`);
}

export function isBuildConfig(input: any[]): boolean {
  const {
    1: { isa },
  } = input;
  return isa === 'XCBuildConfiguration';
}

export function removeTestHosts(input: any[]): boolean {
  const {
    1: { buildSettings },
  } = input;

  return !buildSettings.TEST_HOST;
}
