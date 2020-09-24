import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import * as path from 'path';

export async function getMainActivityAsync(
  projectRoot: string
): Promise<{ path: string; language: 'java' | 'kt' }> {
  const mainActivityJavaPath = globSync(
    path.join(projectRoot, 'android/app/src/main/java/**/MainActivity.')
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
