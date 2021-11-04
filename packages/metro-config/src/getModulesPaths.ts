import findWorkspaceRoot from 'find-yarn-workspace-root';
import path from 'path';

export function getModulesPaths(projectRoot: string): string[] {
  const paths: string[] = [];
  paths.push(path.resolve(projectRoot, 'node_modules'));

  const workspaceRoot = findWorkspaceRoot(path.resolve(projectRoot)); // Absolute path or null
  if (workspaceRoot) {
    paths.push(path.resolve(workspaceRoot, 'node_modules'));
  }

  return paths;
}
