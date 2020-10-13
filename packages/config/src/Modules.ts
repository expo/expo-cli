import { stat, Stats, statSync } from 'fs-extra';
import { join, resolve } from 'path';
import resolveFrom from 'resolve-from';

import { ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';

export function resolveModule(
  request: string,
  projectRoot: string,
  exp: Pick<ExpoConfig, 'nodeModulesPath'>
): string {
  const fromDir = exp.nodeModulesPath ? exp.nodeModulesPath : projectRoot;
  return resolveFrom(fromDir, request);
}

export function projectHasModule(
  modulePath: string,
  projectRoot: string,
  exp: Pick<ExpoConfig, 'nodeModulesPath'>
): string | undefined {
  const fromDir = exp.nodeModulesPath ? exp.nodeModulesPath : projectRoot;
  return resolveFrom.silent(fromDir, modulePath);
}

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

export function getRootPackageJsonPath(
  projectRoot: string,
  exp: Partial<Pick<ExpoConfig, 'nodeModulesPath'>>
): string {
  const packageJsonPath =
    'nodeModulesPath' in exp && typeof exp.nodeModulesPath === 'string'
      ? join(resolve(projectRoot, exp.nodeModulesPath), 'package.json')
      : join(projectRoot, 'package.json');
  if (!fileExists(packageJsonPath)) {
    throw new ConfigError(
      `The expected package.json path: ${packageJsonPath} does not exist`,
      'MODULE_NOT_FOUND'
    );
  }
  return packageJsonPath;
}
