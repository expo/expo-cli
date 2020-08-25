// @ts-ignore
import { sync as globSync } from 'glob';
import path from 'path';
// @ts-ignore
import { project as Project } from 'xcode';
// @ts-ignore
import pbxFile from 'xcode/lib/pbxFile';

export function getProjectName(projectRoot: string) {
  const sourceRoot = getSourceRoot(projectRoot);
  return path.basename(sourceRoot);
}

export function getSourceRoot(projectRoot: string) {
  const paths = globSync('ios/*/AppDelegate.m', {
    absolute: true,
    cwd: projectRoot,
  });
  return path.dirname(paths[0]);
}

// TODO: define this type later
export type Pbxproj = any;
export type Pbxgroup = {
  children: { comment?: string }[];
};

// TODO(brentvatne): I couldn't figure out how to do this with an existing
// higher level function exposed by the xcode library, but we should find out how to do
// that and replace this with it
export function addFileToGroup(filepath: string, groupName: string, project: Project): Pbxproj {
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

  group.children.push({ value: file.fileRef, comment: file.basename });
  return project;
}

function splitPath(path: string): string[] {
  // TODO: Should we account for other platforms that may not use `/`
  return path.split('/');
}

const findGroup = (group: Pbxgroup, name: string): any =>
  group.children.find(group => group.comment === name);

function pbxGroupByPath(project: Pbxproj, path: string): null | Pbxgroup {
  const { firstProject } = project.getFirstProject();

  const group = project.getPBXGroupByKey(firstProject.mainGroup);

  const components = splitPath(path);
  for (const name of components) {
    const foundGroup = findGroup(group, name);
    if (foundGroup) {
      return project.getPBXGroupByKey(foundGroup.value);
    }
  }

  return group;
}

export function ensureGroupRecursively(project: Pbxproj, filepath: string): Pbxgroup | null {
  const components = splitPath(filepath);
  const hasChild = (group: Pbxgroup, name: string) =>
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
  return topMostGroup;
}

/**
 * Get the pbxproj for the given path
 */
export function getPbxproj(projectRoot: string): Pbxproj {
  const pbxprojPaths = globSync('ios/*/project.pbxproj', { absolute: true, cwd: projectRoot });
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

export type ProjectSection = Record<string, ProjectSectionItem>;
export type ProjectSectionItem = {
  isa: string;
  attributes: {
    TargetAttributes: Record<
      string,
      {
        DevelopmentTeam?: string;
        ProvisioningStyle?: string;
      }
    >;
  };
  targets: {
    value: string;
  }[];
};
export type ProjectSectionEntry = [string, ProjectSectionItem];

export function getProjectSection(project: Pbxproj): ProjectSection {
  return project.pbxProjectSection();
}

export type ConfigurationLists = Record<string, ConfigurationList>;
export type ConfigurationList = {
  isa: string;
  buildConfigurations: {
    value: string;
  }[];
};
export type ConfigurationListsEntry = [string, ConfigurationList];

export function getXCConfigurationLists(project: Pbxproj): ConfigurationList[] {
  const lists = project.pbxXCConfigurationList() as ConfigurationLists;
  return Object.entries(lists)
    .filter(isNotComment)
    .map(([, value]) => value);
}

export type ConfigurationSection = Record<string, ConfigurationSectionItem>;
export type ConfigurationSectionItem = {
  isa: string;
  buildSettings: {
    PRODUCT_NAME?: string;
    PRODUCT_BUNDLE_IDENTIFIER?: string;
    PROVISIONING_PROFILE_SPECIFIER?: string;
    TEST_HOST?: any;
    DEVELOPMENT_TEAM?: string;
    CODE_SIGN_IDENTITY?: string;
    CODE_SIGN_STYLE?: string;
  };
};
export type ConfigurationSectionEntry = [string, ConfigurationSectionItem];

export function getXCBuildConfigurationSection(project: Pbxproj): ConfigurationSection {
  return project.pbxXCBuildConfigurationSection();
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
  | ConfigurationListsEntry): boolean {
  return !key.endsWith(`_comment`);
}
