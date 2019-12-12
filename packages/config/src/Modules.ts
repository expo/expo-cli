import resolveFrom from 'resolve-from';
import { stat, statSync } from 'fs-extra';
import { ExpoConfig } from './Config.types';

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

export async function fileExistsAsync(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch (e) {
    return false;
  }
}

export function fileExists(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch (e) {
    return false;
  }
}
