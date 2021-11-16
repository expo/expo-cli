import findWorkspaceRoot from 'find-yarn-workspace-root';
import path from 'path';

export function getModulesPaths(projectRoot: string): string[] {
  const paths: string[] = [];

  // Only add the project root if it's not the current working directory
  // this minimizes the chance of Metro resolver breaking on new Node.js versions.
  const workspaceRoot = findWorkspaceRoot(path.resolve(projectRoot)); // Absolute path or null
  if (workspaceRoot) {
    paths.push(path.resolve(projectRoot));
    paths.push(path.resolve(workspaceRoot, 'node_modules'));
  }

  return paths;
}
