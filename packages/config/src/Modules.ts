import resolveFrom from 'resolve-from';

import { ExpoConfig } from './Config.types';

export function resolveModule(request: string, projectRoot: string, exp: ExpoConfig): string {
  const fromDir = exp.nodeModulesPath ? exp.nodeModulesPath : projectRoot;
  return resolveFrom(fromDir, request);
}

// TODO: Bacon: E2E test
export function projectHasModule(
  modulePath: string,
  projectRoot: string,
  exp: ExpoConfig
): string | false {
  try {
    return resolveModule(modulePath, projectRoot, exp);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      const moduleName = moduleNameFromPath(modulePath);
      if (error.message.includes(moduleName)) {
        return false;
      }
    }
    throw error;
  }
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
