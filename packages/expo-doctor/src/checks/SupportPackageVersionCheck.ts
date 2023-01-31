import { warnAboutDeepDependenciesAsync } from '../dependencies/explain';
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
  description = 'Checking support package versions for SDK 45+ projects';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    if (
      gteSdkVersion(exp, '45.0.0') &&
      !(await validateSupportPackagesAsync(exp.sdkVersion!, projectRoot))
    ) {
      issues.push(`See errors above for details. You may need to upgrade some dependencies.`);
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
