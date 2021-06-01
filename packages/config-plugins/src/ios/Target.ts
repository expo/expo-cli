import { PBXNativeTarget, PBXTargetDependency, XcodeProject } from 'xcode';

import { getApplicationTargetNameForSchemeAsync } from './BuildScheme';
import { getPbxproj, isNotComment, NativeTargetSectionEntry } from './utils/Xcodeproj';

export enum TargetType {
  APPLICATION = 'com.apple.product-type.application',
  EXTENSION = 'com.apple.product-type.app-extension',
  OTHER = 'other',
}

export interface Target {
  name: string;
  type: TargetType;
  dependencies?: Target[];
}

export async function findApplicationTargetWithDependenciesAsync(
  projectRoot: string,
  scheme: string
): Promise<Target> {
  const applicationTargetName = await getApplicationTargetNameForSchemeAsync(projectRoot, scheme);
  const project = getPbxproj(projectRoot);
  const [, applicationTarget] = findNativeTargetByName(project, applicationTargetName);

  const dependencies: Target[] = applicationTarget.dependencies.map(({ value }) => {
    const { target: targetId } = project.getPBXGroupByKeyAndType(
      value,
      'PBXTargetDependency'
    ) as PBXTargetDependency;

    const [, target] = findNativeTargetById(project, targetId);

    const type = isTargetOfType(target, TargetType.EXTENSION)
      ? TargetType.EXTENSION
      : TargetType.OTHER;
    return {
      name: target.name,
      type,
    };
  });

  return {
    name: applicationTarget.name,
    type: TargetType.APPLICATION,
    dependencies,
  };
}

function isTargetOfType(target: PBXNativeTarget, targetType: TargetType): boolean {
  return target.productType === targetType || target.productType === `"${targetType}"`;
}

export function getNativeTargets(project: XcodeProject): NativeTargetSectionEntry[] {
  const section = project.pbxNativeTargetSection();
  return Object.entries(section).filter(isNotComment);
}

export function findFirstNativeTarget(project: XcodeProject): NativeTargetSectionEntry {
  const targets = getNativeTargets(project);
  const applicationTargets = targets.filter(([, target]) =>
    isTargetOfType(target, TargetType.APPLICATION)
  );
  if (applicationTargets.length === 0) {
    throw new Error(`Could not find any application target in project.pbxproj`);
  }
  return applicationTargets[0];
}

export function findNativeTargetByName(
  project: XcodeProject,
  targetName: string
): NativeTargetSectionEntry {
  const nativeTargets = getNativeTargets(project);
  const nativeTargetEntry = nativeTargets.find(
    ([, i]) => i.name === targetName || i.name === `"${targetName}"`
  );
  if (!nativeTargetEntry) {
    throw new Error(`Could not find target '${targetName}' in project.pbxproj`);
  }
  return nativeTargetEntry;
}

function findNativeTargetById(project: XcodeProject, targetId: string): NativeTargetSectionEntry {
  const nativeTargets = getNativeTargets(project);
  const nativeTargetEntry = nativeTargets.find(([key]) => key === targetId);
  if (!nativeTargetEntry) {
    throw new Error(`Could not find target with id '${targetId}' in project.pbxproj`);
  }
  return nativeTargetEntry;
}
