import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import * as path from 'path';

export async function getMainActivityAsync(
  projectRoot: string
): Promise<{ path: string; language: 'java' | 'kt' }> {
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
  return {
    path: isJava ? mainActivityPathJava : mainActivityPathKotlin,
    language: isJava ? 'java' : 'kt',
  };
}

export function getAndroidBuildGradle(projectRoot: string): string {
  return path.join(projectRoot, 'android', 'build.gradle');
}

export function getAppBuildGradle(projectRoot: string): string {
  return path.join(projectRoot, 'android', 'app', 'build.gradle');
}

export async function getAndroidManifestAsync(projectRoot: string): Promise<string> {
  const shellPath = path.join(projectRoot, 'android');
  try {
    if ((await fs.stat(shellPath)).isDirectory()) {
      const manifestPath = path.join(shellPath, 'app/src/main/AndroidManifest.xml');
      if ((await fs.stat(manifestPath)).isFile()) {
        return manifestPath;
      }
    }
  } catch {}

  throw new Error(`Could not find AndroidManifest.xml in project directory: "${projectRoot}"`);
}

export async function getResourceXMLAsync(
  projectDir: string,
  { kind = 'values', name }: { kind?: string; name: string }
): Promise<string> {
  const shellPath = path.join(projectDir, 'android');
  try {
    if ((await fs.stat(shellPath)).isDirectory()) {
      const stylesPath = path.join(shellPath, `app/src/main/res/${kind}/${name}.xml`);
      //   await fs.ensureFile(stylesPath);
      if ((await fs.stat(stylesPath)).isFile()) {
        return stylesPath;
      }
    }
  } catch {}

  throw new Error(
    `Could not find android/app/src/main/res/${kind}/${name}.xml because the android project folder is missing.`
  );
}
