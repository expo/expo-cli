import { ExpoConfig } from '@expo/config-types';
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

import { assert } from '../../utils/errors';
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

// TODO: come up with a better solution for using app.json expo.name in various places
function sanitizedName(name: string) {
  return name
    .replace(/[\W_]+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// TODO: it's silly and kind of fragile that we look at app config to determine
// the ios project paths. Overall this function needs to be revamped, just a
// placeholder for now! Make this more robust when we support applying config
// at any time (currently it's only applied on eject).
export function getHackyProjectName(projectRoot: string, config: ExpoConfig): string {
  // Attempt to get the current ios folder name (apply).
  try {
    return getProjectName(projectRoot);
  } catch {
    // If no iOS project exists then create a new one (eject).
    const projectName = config.name;
    assert(projectName, 'Your project needs a name in app.json/app.config.js.');
    return sanitizedName(projectName);
  }
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
  project.addToPbxResourcesBuildPhase(file);
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
