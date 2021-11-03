// Copied over from `@expo/config-plugins/src/ios/Paths`
import assert from 'assert';
import { pathExistsSync } from 'fs-extra';
import { sync as globSync } from 'glob';
import * as path from 'path';
import { XcodeProject } from 'xcode';

const ignoredPaths = ['**/@(Carthage|Pods|vendor|node_modules)/**'];

export function getAllXcodeProjectPaths(projectRoot: string): string[] {
  const iosFolder = 'ios';
  const pbxprojPaths = globSync('**/*.xcodeproj', { cwd: projectRoot, ignore: ignoredPaths })
    .filter(project => !/test|example|sample/i.test(project) || path.dirname(project) === iosFolder)
    .sort(project => (path.dirname(project) === iosFolder ? -1 : 1))
    // sort alphabetically to ensure this works the same across different devices (Fail in CI (linux) without this)
    .sort();

  if (!pbxprojPaths.length) {
    throw new Error(
      `Failed to locate the ios/*.xcodeproj files relative to path "${projectRoot}".`
    );
  }
  return pbxprojPaths.map(value => path.join(projectRoot, value));
}

export function getAllPBXProjectPaths(projectRoot: string): string[] {
  const projectPaths = getAllXcodeProjectPaths(projectRoot);
  const paths = projectPaths
    .map(value => path.join(value, 'project.pbxproj'))
    .filter(value => pathExistsSync(value));

  if (!paths.length) {
    throw new Error(
      `Failed to locate the ios/*.xcodeproj/project.pbxproj files relative to path "${projectRoot}".`
    );
  }
  return paths;
}

export function getApplicationNativeTarget({
  project,
  projectName,
}: {
  project: XcodeProject;
  projectName: string;
}) {
  const applicationNativeTarget = project.getTarget('com.apple.product-type.application');
  assert(
    applicationNativeTarget,
    `Couldn't locate application PBXNativeTarget in '.xcodeproj' file.`
  );
  assert(
    String(applicationNativeTarget.target.name) === projectName,
    `Application native target name mismatch. Expected ${projectName}, but found ${applicationNativeTarget.target.name}.`
  );
  return applicationNativeTarget;
}
