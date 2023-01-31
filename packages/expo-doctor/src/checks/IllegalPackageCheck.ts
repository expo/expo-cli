import { warnAboutDeepDependenciesAsync } from '../utils/explainDependencies';
import { gteSdkVersion } from '../utils/gteSdkVersion';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

// Ensures that a set of packages
async function validateIllegalPackagesAsync(projectRoot: string): Promise<boolean> {
  const illegalPackages = [
    '@unimodules/core',
    '@unimodules/react-native-adapter',
    'react-native-unimodules',
  ];

  let allPackagesLegal = true;

  for (const pkg of illegalPackages) {
    const isPackageAbsent = await warnAboutDeepDependenciesAsync({ name: pkg }, projectRoot);
    if (!isPackageAbsent) {
      allPackagesLegal = false;
    }
  }

  return allPackagesLegal;
}

export default class IllegalPackageCheck implements DoctorCheck {
  description = 'Checking for incompatible packages';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const advice: string[] = [];

    if (gteSdkVersion(exp, '44.0.0') && !(await validateIllegalPackagesAsync(projectRoot))) {
      advice.push(`Remove any 'unimodules' packages from your project.`);
    }

    return {
      isSuccessful: advice.length === 0,
      advice,
      // issues are output as check is run
      issues: [],
    };
  }
}
