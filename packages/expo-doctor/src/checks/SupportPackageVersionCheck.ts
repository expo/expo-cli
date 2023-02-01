import { warnAboutDeepDependenciesAsync } from '../utils/explainDependencies';
import { getRemoteVersionsForSdkAsync } from '../utils/getRemoteVersionsForSdkAsync';
import { gteSdkVersion } from '../utils/gteSdkVersion';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

export class SupportPackageVersionCheck implements DoctorCheck {
  description = 'Verifying prebuild support package versions are compatible';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const advice: string[] = [];
    const issues: string[] = [];

    if (gteSdkVersion(exp, '45.0.0')) {
      const versionsForSdk = await getRemoteVersionsForSdkAsync(exp.sdkVersion);

      const supportPackagesToValidate = [
        'expo-modules-autolinking',
        '@expo/config-plugins',
        '@expo/prebuild-config',
      ];
      for (const pkg of supportPackagesToValidate) {
        const version = versionsForSdk[pkg];
        if (version) {
          const warning = await warnAboutDeepDependenciesAsync({ name: pkg, version }, projectRoot);
          if (warning) {
            issues.push(warning);
          }
        }
      }
      if (issues.length) {
        advice.push(`Upgrade dependencies that are using the invalid package versions.`);
      }
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
      advice,
    };
  }
}
