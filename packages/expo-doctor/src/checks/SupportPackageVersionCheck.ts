import { getDeepDependenciesWarningAsync } from '../utils/explainDependencies';
import { getRemoteVersionsForSdkAsync } from '../utils/getRemoteVersionsForSdkAsync';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

export class SupportPackageVersionCheck implements DoctorCheck {
  description = 'Verifying prebuild support package versions are compatible';

  sdkVersionRange = '>=45.0.0';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const advice: string[] = [];
    const issues: string[] = [];

    const versionsForSdk = await getRemoteVersionsForSdkAsync(exp.sdkVersion);

    // only check for packages that have a required semver for the current SDK version
    const supportPackagesToValidate = [
      'expo-modules-autolinking',
      '@expo/config-plugins',
      '@expo/prebuild-config',
    ].filter(pkg => versionsForSdk[pkg]);

    // check that a specific semver is installed for each package
    const possibleWarnings = await Promise.all(
      supportPackagesToValidate.map(pkg =>
        getDeepDependenciesWarningAsync({ name: pkg, version: versionsForSdk[pkg] }, projectRoot)
      )
    );

    possibleWarnings.forEach(possibleWarning => {
      if (possibleWarning) {
        issues.push(possibleWarning);
      }
    });

    if (issues.length) {
      advice.push(`Upgrade dependencies that are using the invalid package versions.`);
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
      advice,
    };
  }
}
