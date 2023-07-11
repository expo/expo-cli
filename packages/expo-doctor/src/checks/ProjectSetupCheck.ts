import fs from 'fs';

import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

export class ProjectSetupCheck implements DoctorCheck {
  description = 'Check for common project setup issues';

  sdkVersionRange = '*';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    // ** possibly-unintentionally-bare check **

    if (
      (fs.existsSync(`${projectRoot}/ios`) || fs.existsSync(`${projectRoot}/android`)) &&
      exp.plugins?.length
    ) {
      issues.push(
        'This project has native project folders but is also configured to use Prebuild. EAS Build will not sync your native configuration if the ios or android folders are present. Gitignore these folders intend to use Prebuild (aka "managed" workflow).'
      );
    }

    // ** multiple lock file check **

    const lockfileCheckResults = await Promise.all(
      ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'].map(lockfile => {
        return { lockfile, exists: fs.existsSync(`${projectRoot}/${lockfile}`) };
      })
    );

    const lockfiles = lockfileCheckResults
      .filter(result => result.exists)
      .map(result => result.lockfile);

    if (lockfiles.length > 1) {
      issues.push(
        `This project has multiple package manager lock files (${lockfiles.join(
          ', '
        )}). This may cause EAS build to restore dependencies with a different package manager from what you use in other environments.`
      );
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
