import nodeAssert from 'assert';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import * as path from 'path';

export interface ProjectFile<L extends string = string> {
  path: string;
  language: L;
  contents: string;
}

export function assert(value: any, message?: string | Error): asserts value {
  // TODO: Upgrade node? TypeScript isn't properly asserting values without this wrapper.
  return nodeAssert(value, message);
}

export type ApplicationProjectFile = ProjectFile<'java' | 'kt'>;

async function getProjectFileAsync(
  projectRoot: string,
  name: string
): Promise<ApplicationProjectFile> {
  const mainActivityJavaPath = globSync(
    path.join(projectRoot, `android/app/src/main/java/**/${name}.{java,kt}`)
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

export async function getMainActivityAsync(projectRoot: string): Promise<ApplicationProjectFile> {
  return getProjectFileAsync(projectRoot, 'MainActivity');
}
