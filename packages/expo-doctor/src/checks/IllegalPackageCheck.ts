import { warnAboutDeepDependenciesAsync } from '../dependencies/explain';
import { gteSdkVersion } from '../utils/gteSdkVersion';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

// Ensures that a set of packages
async function validateIllegalPackagesAsync(): Promise<boolean> {
  const illegalPackages = [
    '@unimodules/core',
    '@unimodules/react-native-adapter',
    'react-native-unimodules',
  ];

  let allPackagesLegal = true;

  for (const pkg of illegalPackages) {
    const isPackageAbsent = await warnAboutDeepDependenciesAsync({ name: pkg });
    if (!isPackageAbsent) {
      allPackagesLegal = false;
    }
  }

  return allPackagesLegal;
}

export default class IllegalPackageCheck implements DoctorCheck {
  description = 'Checking for packages not allowed in SDK 44+ projects';

  async runAsync({ exp }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    if (gteSdkVersion(exp, '44.0.0') && !(await validateIllegalPackagesAsync())) {
      issues.push(
        `See errors above for details. You may need to remove these packages from your project.`
      );
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
