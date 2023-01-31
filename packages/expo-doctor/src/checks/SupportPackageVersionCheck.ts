import { warnAboutDeepDependenciesAsync } from '../utils/explainDependencies';
import { getRemoteVersionsForSdkAsync } from '../utils/getRemoteVersionsForSdkAsync';
import { gteSdkVersion } from '../utils/gteSdkVersion';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

// Ensures that a set of packages
async function validateSupportPackagesAsync(
  sdkVersion: string,
  projectRoot: string
): Promise<boolean> {
  const versionsForSdk = await getRemoteVersionsForSdkAsync(sdkVersion);

  const supportPackagesToValidate = [
    'expo-modules-autolinking',
    '@expo/config-plugins',
    '@expo/prebuild-config',
  ];

  let allPackagesValid = true;
  for (const pkg of supportPackagesToValidate) {
    const version = versionsForSdk[pkg];
    if (version) {
      const isVersionValid = await warnAboutDeepDependenciesAsync(
        { name: pkg, version },
        projectRoot
      );
      if (!isVersionValid) {
        allPackagesValid = false;
      }
    }
  }
  return allPackagesValid;
}

export default class SupportPackageVersionCheck implements DoctorCheck {
  description = 'Verifying version of installed support packages are compatible';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const advice: string[] = [];

    if (
      gteSdkVersion(exp, '45.0.0') &&
      !(await validateSupportPackagesAsync(exp.sdkVersion!, projectRoot))
    ) {
      advice.push(`Upgrade dependencies that are using the invalid package versions.`);
    }

    return {
      isSuccessful: advice.length === 0,
      // issues are output by deep dependency checker
      issues: [],
      advice,
    };
  }
}
