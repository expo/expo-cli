import * as path from 'path';
import xcode, {
  PBXGroup,
  PBXNativeTarget,
  PBXProject,
  UUID,
  XCBuildConfiguration,
  XCConfigurationList,
  XcodeProject,
} from 'xcode';
import pbxFile from 'xcode/lib/pbxFile';

import * as Paths from '../Paths';

export type ProjectSectionEntry = [string, PBXProject];

export type NativeTargetSection = Record<string, PBXNativeTarget>;

export type NativeTargetSectionEntry = [string, PBXNativeTarget];

export type ConfigurationLists = Record<string, XCConfigurationList>;

export type ConfigurationListEntry = [string, XCConfigurationList];

export type ConfigurationSectionEntry = [string, XCBuildConfiguration];

export function getProjectName(projectRoot: string) {
  const sourceRoot = Paths.getSourceRoot(projectRoot);
  return path.basename(sourceRoot);
}

export function getApplicationNativeTarget({
  project,
  projectName,
}: {
  project: XcodeProject;
  projectName: string;
}) {
  const applicationNativeTarget = project.getTarget('com.apple.product-type.application');
  if (!applicationNativeTarget) {
    throw new Error(`Couldn't locate application PBXNativeTarget in '.xcodeproj' file.`);
  }

  if (String(applicationNativeTarget.target.name) !== projectName) {
    throw new Error(
      `Application native target name mismatch. Expected ${projectName}, but found ${applicationNativeTarget.target.name}.`
    );
  }
  return applicationNativeTarget;
}

/**
 * @param filePath
 * @param param1.target PBXNativeTarget reference
 * @param param1.group PBXGroup reference
 */
export function addStoryboardFileToProject(
  pbxProject: XcodeProject,
  filePath: string,
  { target, group }: { target: UUID; group: UUID }
) {
  const file = pbxProject.addFile(filePath, undefined, {
    lastKnownFileType: 'file.storyboard',
    defaultEncoding: 4,
    target,
  });
  if (!file) {
    throw new Error('File already exists in the project');
  }
  delete pbxProject.pbxFileReferenceSection()[file.fileRef].explicitFileType;
  delete pbxProject.pbxFileReferenceSection()[file.fileRef].includeInIndex;

  file.uuid = pbxProject.generateUuid();
  file.target = target;

  pbxProject.addToPbxBuildFileSection(file);
  pbxProject.addToPbxResourcesBuildPhase(file);
  pbxProject.addToPbxGroup(file, group);
}

// TODO(brentvatne): I couldn't figure out how to do this with an existing
// higher level function exposed by the xcode library, but we should find out how to do
// that and replace this with it
export function addFileToGroup(
  filepath: string,
  groupName: string,
  project: XcodeProject
): XcodeProject {
  const file = new pbxFile(filepath);
  file.uuid = project.generateUuid();
  file.fileRef = project.generateUuid();
  project.addToPbxFileReferenceSection(file);
  project.addToPbxBuildFileSection(file);
  project.addToPbxSourcesBuildPhase(file);
  const group = pbxGroupByPath(project, groupName);
  if (!group) {
    throw Error(`Group by name ${groupName} not found!`);
  }

  group.children.push({
    value: file.fileRef,
    comment: file.basename,
  });
  return project;
}

function splitPath(path: string): string[] {
  // TODO: Should we account for other platforms that may not use `/`
  return path.split('/');
}

const findGroup = (
  group: PBXGroup | undefined,
  name: string
):
  | {
      value: UUID;
      comment?: string;
    }
  | undefined => {
  if (!group) {
    return undefined;
  }

  return group.children.find(group => group.comment === name);
};

function findGroupInsideGroup(
  project: XcodeProject,
  group: PBXGroup | undefined,
  name: string
): null | PBXGroup {
  const foundGroup = findGroup(group, name);
  if (foundGroup) {
    return project.getPBXGroupByKey(foundGroup.value) ?? null;
  }
  return null;
}

function pbxGroupByPath(project: XcodeProject, path: string): null | PBXGroup {
  const { firstProject } = project.getFirstProject();

  let group = project.getPBXGroupByKey(firstProject.mainGroup);

  const components = splitPath(path);
  for (const name of components) {
    const nextGroup = findGroupInsideGroup(project, group, name);
    if (nextGroup) {
      group = nextGroup;
    } else {
      return null;
    }
  }

  return group ?? null;
}

export function ensureGroupRecursively(project: XcodeProject, filepath: string): PBXGroup | null {
  const components = splitPath(filepath);
  const hasChild = (group: PBXGroup, name: string) =>
    group.children.find(({ comment }) => comment === name);
  const { firstProject } = project.getFirstProject();

  let topMostGroup = project.getPBXGroupByKey(firstProject.mainGroup);

  for (const pathComponent of components) {
    if (topMostGroup && !hasChild(topMostGroup, pathComponent)) {
      topMostGroup.children.push({
        comment: pathComponent,
        value: project.pbxCreateGroup(pathComponent, '""'),
      });
    }
    topMostGroup = project.pbxGroupByName(pathComponent);
  }
  return topMostGroup ?? null;
}

/**
 * Get the pbxproj for the given path
 */
export function getPbxproj(projectRoot: string): XcodeProject {
  const projectPath = Paths.getPBXProjectPath(projectRoot);
  const project = xcode.project(projectPath);
  project.parseSync();
  return project;
}

/**
 * Get the productName for a project, if the name is using a variable `$(TARGET_NAME)`, then attempt to get the value of that variable.
 *
 * @param project
 */
export function getProductName(project: XcodeProject): string {
  let productName = project.productName;

  if (productName === '$(TARGET_NAME)') {
    const targetName = project.getFirstTarget()?.firstTarget?.productName;
    productName = targetName ?? project.productName;
  }

  return productName;
}

export function getProjectSection(project: XcodeProject) {
  return project.pbxProjectSection();
}

export function getNativeTargets(project: XcodeProject): NativeTargetSectionEntry[] {
  const section = project.pbxNativeTargetSection();
  return Object.entries(section).filter(isNotComment);
}

export function findFirstNativeTarget(project: XcodeProject): PBXNativeTarget {
  const { targets } = Object.values(getProjectSection(project))[0];
  const target = targets[0].value;

  const nativeTargets = getNativeTargets(project);
  const nativeTarget = (nativeTargets.find(
    ([key]) => key === target
  ) as NativeTargetSectionEntry)[1];
  return nativeTarget;
}

export function getXCConfigurationListEntries(project: XcodeProject): ConfigurationListEntry[] {
  const lists = project.pbxXCConfigurationList();
  return Object.entries(lists).filter(isNotComment);
}

export function getBuildConfigurationForId(
  project: XcodeProject,
  configurationListId: string
): ConfigurationSectionEntry[] {
  const configurationListEntries = getXCConfigurationListEntries(project);
  const [, configurationList] = configurationListEntries.find(
    ([key]) => key === configurationListId
  ) as ConfigurationListEntry;

  const buildConfigurations = configurationList.buildConfigurations.map(i => i.value);

  return Object.entries(project.pbxXCBuildConfigurationSection())
    .filter(isNotComment)
    .filter(isBuildConfig)
    .filter(isNotTestHost)
    .filter(([key]: ConfigurationSectionEntry) => buildConfigurations.includes(key));
}

export function isBuildConfig([, sectionItem]: ConfigurationSectionEntry): boolean {
  return sectionItem.isa === 'XCBuildConfiguration';
}

export function isNotTestHost([, sectionItem]: ConfigurationSectionEntry): boolean {
  return !sectionItem.buildSettings.TEST_HOST;
}

export function isNotComment([key]:
  | ConfigurationSectionEntry
  | ProjectSectionEntry
  | ConfigurationListEntry
  | NativeTargetSectionEntry): boolean {
  return !key.endsWith(`_comment`);
}
