import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

export default class GlobalPrereqsVersionCheck implements DoctorCheck {
  description = 'Validating global prerequisites versions...';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    // TODO: implement this check

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
