import assert from 'assert';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import * as path from 'path';

import { directoryExistsAsync } from '../utils/modules';
import { ResourceKind } from './Resources';

export interface ProjectFile<L extends string = string> {
  path: string;
  language: L;
  contents: string;
}

export type GradleProjectFile = ProjectFile<'groovy' | 'kt'>;

export type ApplicationProjectFile = ProjectFile<'java' | 'kt'>;

async function getProjectFileAsync(
  projectRoot: string,
  name: string
): Promise<ApplicationProjectFile> {
  const mainActivityJavaPath = globSync(
    path.join(projectRoot, `android/app/src/main/java/**/${name}.@(java|kt)`)
  )[0];
  assert(
    mainActivityJavaPath,
    `Project file "${name}" does not exist in android project for root "${projectRoot}"`
  );

  const mainActivityPathJava = path.resolve(mainActivityJavaPath, `../${name}.java`);
  const mainActivityPathKotlin = path.resolve(mainActivityJavaPath, `../${name}.kt`);

  const isJava = await fs.pathExists(mainActivityPathJava);
  const isKotlin = !isJava && (await fs.pathExists(mainActivityPathKotlin));

  if (!isJava && !isKotlin) {
    throw new Error(`Failed to find '${name}' file for project: ${projectRoot}.`);
  }
  const filePath = isJava ? mainActivityPathJava : mainActivityPathKotlin;
  return {
    path: path.normalize(filePath),
    contents: fs.readFileSync(filePath, 'utf8'),
    language: isJava ? 'java' : 'kt',
  };
}

export async function getMainApplicationAsync(
  projectRoot: string
): Promise<ApplicationProjectFile> {
  return getProjectFileAsync(projectRoot, 'MainApplication');
}

export async function getMainActivityAsync(projectRoot: string): Promise<ApplicationProjectFile> {
  return getProjectFileAsync(projectRoot, 'MainActivity');
}

async function getGradleFileAsync(
  projectRoot: string,
  gradleName: string
): Promise<GradleProjectFile> {
  const groovyPath = path.resolve(projectRoot, `${gradleName}.gradle`);
  const ktPath = path.resolve(projectRoot, `${gradleName}.gradle.kts`);

  const isGroovy = await fs.pathExists(groovyPath);
  const isKotlin = !isGroovy && (await fs.pathExists(ktPath));

  if (!isGroovy && !isKotlin) {
    throw new Error(`Failed to find '${gradleName}.gradle' file for project: ${projectRoot}.`);
  }
  const filePath = isGroovy ? groovyPath : ktPath;
  return {
    path: path.normalize(filePath),
    contents: fs.readFileSync(filePath, 'utf8'),
    language: isGroovy ? 'groovy' : 'kt',
  };
}

export async function getProjectBuildGradleAsync(projectRoot: string): Promise<GradleProjectFile> {
  return getGradleFileAsync(path.join(projectRoot, 'android'), 'build');
}

export async function getSettingsGradleAsync(projectRoot: string): Promise<GradleProjectFile> {
  return getGradleFileAsync(path.join(projectRoot, 'android'), 'settings');
}

export async function getAppBuildGradleAsync(projectRoot: string): Promise<GradleProjectFile> {
  return getGradleFileAsync(path.join(projectRoot, 'android', 'app'), 'build');
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

export async function getResourceFolderAsync(projectRoot: string): Promise<string> {
  const projectPath = await getProjectPathOrThrowAsync(projectRoot);
  return path.join(projectPath, `app/src/main/res`);
}

export async function getResourceXMLPathAsync(
  projectRoot: string,
  { kind = 'values', name }: { kind?: ResourceKind; name: 'colors' | 'strings' | 'styles' | string }
): Promise<string> {
  const resourcePath = await getResourceFolderAsync(projectRoot);

  const filePath = path.join(resourcePath, `${kind}/${name}.xml`);
  return filePath;
}
