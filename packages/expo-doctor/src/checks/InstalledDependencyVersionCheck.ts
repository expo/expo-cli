import chalk from 'chalk';
import shell from 'shelljs';

import { logNewSection } from '../utils/ora';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

export default class InstalledDependencyVersionCheck implements DoctorCheck {
  description = 'Checking dependency versions for compatibility with installed SDK...';

  async runAsync({ projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    // dependency check
    const ora = logNewSection(`Checking versions...`);
    const originalPwd = shell.pwd().stdout;

    shell.cd(projectRoot);

    const installCheckOutput = shell.exec('echo "n" | npx expo install --check', { silent: true });

    console.log(chalk.yellow(installCheckOutput.stderr));
    if (installCheckOutput.code !== 0) {
      issues.push(`One or more packages are incompatible with your Expo SDK version.`);
    }
    ora.stop();
    shell.cd(originalPwd);

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
