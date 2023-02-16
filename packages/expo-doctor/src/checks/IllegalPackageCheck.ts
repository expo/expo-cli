import { learnMore } from '../utils/TerminalLink';
import { getDeepDependenciesWarningAsync } from '../utils/explainDependencies';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

export class IllegalPackageCheck implements DoctorCheck {
  description = 'Checking for incompatible packages';

  sdkVersionRange = '>=44.0.0';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];
    const advice: string[] = [];

    const illegalPackages = [
      '@unimodules/core',
      '@unimodules/react-native-adapter',
      'react-native-unimodules',
    ];

    for (const pkg of illegalPackages) {
      const warning = await getDeepDependenciesWarningAsync({ name: pkg }, projectRoot);
      if (warning) {
        issues.push(warning);
      }
    }

    if (issues.length) {
      advice.push(
        `Remove any 'unimodules' packages from your project. Learn more: ${learnMore(
          'https://expo.fyi/r/sdk-44-remove-unimodules'
        )}`
      );
    }

    return {
      isSuccessful: !issues.length,
      issues,
      advice,
    };
  }
}
