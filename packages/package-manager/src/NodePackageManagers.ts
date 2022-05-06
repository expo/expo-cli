import { existsSync } from 'fs';
import path from 'path';

import { NpmPackageManager } from './NpmPackageManager';
import { Logger } from './PackageManager';
import { PnpmPackageManager } from './PnpmPackageManager';
import { YarnPackageManager } from './YarnPackageManager';
import { findWorkspaceRoot, resolvePackageManager } from './utils/nodeWorkspaces';

export type NodePackageManager = 'yarn' | 'npm' | 'pnpm';

/**
 * Disable various postinstall scripts
 * - https://github.com/opencollective/opencollective-postinstall/pull/9
 */
export const DISABLE_ADS_ENV = { DISABLE_OPENCOLLECTIVE: '1', ADBLOCK: '1' };

/**
 * Returns true if the project is using yarn, false if the project is using npm.
 *
 * @param projectRoot
 */
export function isUsingYarn(projectRoot: string): boolean {
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  if (workspaceRoot) {
    return existsSync(path.join(workspaceRoot, 'yarn.lock'));
  }
  return existsSync(path.join(projectRoot, 'yarn.lock'));
}

export type CreateForProjectOptions = Partial<Record<NodePackageManager, boolean>> & {
  log?: Logger;
  silent?: boolean;
};

export function createForProject(
  projectRoot: string,
  options: CreateForProjectOptions = {}
): NpmPackageManager | YarnPackageManager | PnpmPackageManager {
  let PackageManager;
  if (options.npm) {
    PackageManager = NpmPackageManager;
  } else if (options.yarn) {
    PackageManager = YarnPackageManager;
  } else if (options.pnpm) {
    PackageManager = PnpmPackageManager;
  } else if (isUsingYarn(projectRoot)) {
    PackageManager = YarnPackageManager;
  } else if (resolvePackageManager(projectRoot, 'pnpm')) {
    PackageManager = PnpmPackageManager;
  } else {
    PackageManager = NpmPackageManager;
  }

  return new PackageManager({ cwd: projectRoot, log: options.log, silent: options.silent });
}

export function getModulesPath(projectRoot: string): string {
  const workspaceRoot = findWorkspaceRoot(path.resolve(projectRoot)); // Absolute path or null
  if (workspaceRoot) {
    return path.resolve(workspaceRoot, 'node_modules');
  }

  return path.resolve(projectRoot, 'node_modules');
}
