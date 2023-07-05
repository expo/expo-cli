import { PackageJSONConfig } from '@expo/config';
import fs from 'fs';
import path from 'path';

import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

/**
 * Checks if a package should not be installed directly in a project.
 * @param pkg package.json config
 * @param packageName name of package to check for
 * @returns string if package should not be installed directly, null otherwise
 */
function checkForInvalidDirectInstallPackage(
  pkg: PackageJSONConfig,
  packageName: string
): string | null {
  if (pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName]) {
    return `The package "${packageName}" should not be installed directly in your project. It is a dependency of other Expo packages, which will install it automatically as needed.`;
  }
  return null;
}

export class PackageJsonCheck implements DoctorCheck {
  description = 'Check package.json for common issues';

  sdkVersionRange = '*';

  async runAsync({ pkg, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    // ** check for node_modules/.bin refs in scripts (e.g., can't have "expo" or similar in scripts) **

    const nodeModulesBinPath = path.join(projectRoot, 'node_modules', '.bin');
    // might be in a monorepo and not have node_modules/.bin, so at least check for most problematic conflicts
    const bins = fs.existsSync(nodeModulesBinPath)
      ? fs.readdirSync(nodeModulesBinPath)
      : ['expo', 'react-native'];
    const binsThatExistInScripts = pkg.scripts ? bins.filter(value => pkg.scripts[value]) : [];
    if (binsThatExistInScripts.length) {
      issues.push(
        `The following scripts in package.json conflict with the contents of node_modules/.bin: ${binsThatExistInScripts.join(
          ', '
        )}.` +
          (pkg.scripts?.['expo']
            ? ' This will cause conflicts with the Expo CLI and likely lead to build failures.'
            : '')
      );
    }

    // ** check for dependencies that should only be transitive **
    ['expo-modules-core', 'expo-modules-autolinking', 'expo-dev-launcher', 'expo-dev-menu'].forEach(
      packageName => {
        const result = checkForInvalidDirectInstallPackage(pkg, packageName);
        if (result) {
          issues.push(result);
        }
      }
    );

    // ** check for conflicts between package name and installed packages **

    const installedPackages = Object.keys(pkg.dependencies ?? {}).concat(
      Object.keys(pkg.devDependencies ?? {})
    );

    if (installedPackages.includes(pkg.name)) {
      issues.push(
        `The name in your package.json is set to "${pkg.name}", which conflicts with a dependency of the same name.`
      );
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
