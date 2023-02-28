import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

function getDirectPackageInstallErrorMessage(pkg: string): string {
  return `The package "${pkg}" should not be installed directly in your project. It is a dependency of other Expo packages and should be installed automatically.`;
}

export class PackageJsonCheck implements DoctorCheck {
  description = 'Checking package.json for common issues';

  sdkVersionRange = '*';

  async runAsync({ pkg }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const advice: string[] = [];
    const issues: string[] = [];

    // check for "expo" in scripts
    if (pkg.scripts?.['expo']) {
      issues.push(
        'The script "expo" is defined in package.json. This will cause conflicts with the Expo CLI and likely lead to build failures.'
      );
    }

    // check for dependencies that should only be transitive
    if (pkg.dependencies?.['expo-modules-core'] || pkg.devDependencies?.['expo-modules-core']) {
      issues.push(getDirectPackageInstallErrorMessage('expo-modules-core'));
    }

    if (
      pkg.dependencies?.['expo-modules-autolinking'] ||
      pkg.devDependencies?.['expo-modules-autolinking']
    ) {
      issues.push(getDirectPackageInstallErrorMessage('expo-modules-autolinking'));
    }

    // check for conflicts between package name and installed packages
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
      advice,
    };
  }
}
