import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import * as path from 'path';

import { directoryExistsAsync } from '../Modules';
import { ResourceKind } from './Resources';

export interface ProjectFile<L extends string = string> {
  path: string;
  language: L;
  contents: string;
}

export type GradleProjectFile = ProjectFile<'groovy' | 'kt'>;

export type ApplicationProjectFile = ProjectFile<'java' | 'kt'>;

export async function getMainActivityAsync(projectRoot: string): Promise<ApplicationProjectFile> {
  const mainActivityJavaPath = globSync(
    path.join(projectRoot, 'android/app/src/main/java/**/MainActivity.{java,kt}')
  )[0];

  const mainActivityPathJava = path.resolve(mainActivityJavaPath, '../MainActivity.java');
  const mainActivityPathKotlin = path.resolve(mainActivityJavaPath, '../MainActivity.kt');

  const isJava = await fs.pathExists(mainActivityPathJava);
  const isKotlin = !isJava && (await fs.pathExists(mainActivityPathKotlin));

  if (!isJava && !isKotlin) {
    throw new Error(`Failed to find 'MainActivity' file for project: ${projectRoot}.`);
  }
  const filePath = isJava ? mainActivityPathJava : mainActivityPathKotlin;
  return {
    path: filePath,
    contents: fs.readFileSync(filePath, 'utf8'),
    language: isJava ? 'java' : 'kt',
  };
}

export async function getProjectBuildGradleAsync(projectRoot: string): Promise<GradleProjectFile> {
  const groovyPath = path.resolve(projectRoot, 'build.gradle');
  const ktPath = path.resolve(projectRoot, 'build.gradle.kts');

  const isGroovy = await fs.pathExists(groovyPath);
  const isKotlin = !isGroovy && (await fs.pathExists(ktPath));

  if (!isGroovy && !isKotlin) {
    throw new Error(`Failed to find 'build.gradle' file for project: ${projectRoot}.`);
  }
  const filePath = isGroovy ? groovyPath : ktPath;
  return {
    path: filePath,
    contents: fs.readFileSync(filePath, 'utf8'),
    language: isGroovy ? 'groovy' : 'kt',
  };
}

export async function getAppBuildGradleAsync(projectRoot: string): Promise<GradleProjectFile> {
  return getProjectBuildGradleAsync(path.join(projectRoot, 'app'));
}

export function getAndroidBuildGradle(projectRoot: string): string {
  return path.join(projectRoot, 'android', 'build.gradle');
}

export function getAppBuildGradle(projectRoot: string): string {
  return path.join(projectRoot, 'android', 'app', 'build.gradle');
}

export async function getProjectPathOrThrowAsync(projectRoot: string): Promise<string> {
  const projectPath = path.join(projectRoot, 'android');
  if (await directoryExistsAsync(projectPath)) {
    return projectPath;
  }
  throw new Error(`Android project folder is missing in project: ${projectRoot}`);
}

export async function getAndroidManifestAsync(projectRoot: string): Promise<string> {
  const projectPath = await getProjectPathOrThrowAsync(projectRoot);

  const filePath = path.join(projectPath, 'app/src/main/AndroidManifest.xml');
  return filePath;
}

export async function getResourceXMLPathAsync(
  projectRoot: string,
  { kind = 'values', name }: { kind?: ResourceKind; name: 'colors' | 'strings' | 'styles' | string }
): Promise<string> {
  const projectPath = await getProjectPathOrThrowAsync(projectRoot);

  const filePath = path.join(projectPath, `app/src/main/res/${kind}/${name}.xml`);
  return filePath;
}
