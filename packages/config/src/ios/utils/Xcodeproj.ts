// @ts-ignore
import { sync as globSync } from 'glob';
import path from 'path';
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

export type ProjectSectionEntry = [string, PBXProject];

export type NativeTargetSection = Record<string, PBXNativeTarget>;

export type NativeTargetSectionEntry = [string, PBXNativeTarget];

export type ConfigurationLists = Record<string, XCConfigurationList>;

export type ConfigurationListEntry = [string, XCConfigurationList];

export type ConfigurationSectionEntry = [string, XCBuildConfiguration];

export function getProjectName(projectRoot: string) {
  const sourceRoot = getSourceRoot(projectRoot);
  return path.basename(sourceRoot);
}

export function getSourceRoot(projectRoot: string): string {
  // Account for Swift or Objective-C
  const paths = globSync('ios/*/AppDelegate.*', {
    absolute: true,
    cwd: projectRoot,
  });
  if (!paths.length) {
    throw new Error(`Could not locate a valid iOS project at root: ${projectRoot}`);
  }
  return path.dirname(paths[0]);
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

export function findSchemeNames(projectRoot: string): string[] {
  const schemePaths = globSync('ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme', {
    absolute: true,
    cwd: projectRoot,
  });
  return schemePaths.map(schemePath => path.basename(schemePath).split('.')[0]);
}

/**
 * Get the pbxproj for the given path
 */
export function getPbxproj(projectRoot: string): XcodeProject {
  const pbxprojPaths = globSync('ios/*/project.pbxproj', { absolute: true, cwd: projectRoot });
  const [pbxprojPath, ...otherPbxprojPaths] = pbxprojPaths;

  if (pbxprojPaths.length > 1) {
    console.warn(
      `Found multiple pbxproject files paths, using ${pbxprojPath}. Other paths ${JSON.stringify(
        otherPbxprojPaths
      )} ignored.`
    );
  }

  const project = xcode.project(pbxprojPath);
  project.parseSync();
  return project;
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
