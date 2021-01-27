import { stat, Stats, statSync } from 'fs-extra';
import { join } from 'path';

import { ConfigError } from './Errors';

export function moduleNameFromPath(modulePath: string): string {
  if (modulePath.startsWith('@')) {
    const [org, packageName] = modulePath.split('/');
    if (org && packageName) {
      return [org, packageName].join('/');
    }
    return modulePath;
  }
  const [packageName] = modulePath.split('/');
  return packageName ? packageName : modulePath;
}

/**
 * A non-failing version of async FS stat.
 *
 * @param file
 */
async function statAsync(file: string): Promise<Stats | null> {
  try {
    return await stat(file);
  } catch {
    return null;
  }
}

export async function fileExistsAsync(file: string): Promise<boolean> {
  return (await statAsync(file))?.isFile() ?? false;
}

export async function directoryExistsAsync(file: string): Promise<boolean> {
  return (await statAsync(file))?.isDirectory() ?? false;
}

export function fileExists(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch (e) {
    return false;
  }
}

export function getRootPackageJsonPath(projectRoot: string): string {
  const packageJsonPath = join(projectRoot, 'package.json');
  if (!fileExists(packageJsonPath)) {
    throw new ConfigError(
      `The expected package.json path: ${packageJsonPath} does not exist`,
      'MODULE_NOT_FOUND'
    );
  }
  return packageJsonPath;
}
