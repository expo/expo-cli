import path from 'path';
import resolveFrom from 'resolve-from';

export default function isDevClientInstalledInProject(projectRoot: string): boolean {
  if (!resolveFrom.silent(projectRoot, 'expo-dev-client')) {
    // Fast return in case we can't even resolve the package.
    return false;
  }
  return isDevClientInDependencies(projectRoot);
}

const DEV_CLIENT_PACKAGE = 'expo-dev-client';

/**
 * Checks if dev client is in direct or transitive (dev)dependencies of the project.
 */
function isDevClientInDependencies(projectRoot: string): boolean {
  let found = false;
  const visitedPackages = new Set<string>();
  const projectPackageJsonPath = path.join(projectRoot, 'package.json');

  // Helper for traversing the dependency hierarchy.
  function visitPackage(packageJsonPath: string) {
    const packageJson = require(packageJsonPath);

    // Prevent getting into the recursive loop.
    if (visitedPackages.has(packageJsonPath) || found) {
      return;
    }
    visitedPackages.add(packageJsonPath);

    // Iterate over the dependencies to find transitive modules.
    const packageNames = [];
    if (packageJson.devDependencies) packageNames.push(...Object.keys(packageJson.devDependencies));
    if (packageJson.dependencies) packageNames.push(...Object.keys(packageJson.dependencies));
    for (const dependencyName of packageNames) {
      if (dependencyName === DEV_CLIENT_PACKAGE) {
        found = true;
        break;
      } else {
        const dependencyPackageJsonPath = resolveFrom.silent(
          projectRoot,
          `${dependencyName}/package.json`
        );
        if (dependencyPackageJsonPath) {
          // Visit the dependency package.
          visitPackage(dependencyPackageJsonPath);
        }
      }
    }
  }

  // Visit project's package.
  visitPackage(projectPackageJsonPath);

  return found;
}
