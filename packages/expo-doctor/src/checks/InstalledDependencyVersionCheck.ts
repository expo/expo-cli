import spawnAsync, { SpawnResult } from '@expo/spawn-async';

import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

function isSpawnResult(result: any): result is SpawnResult {
  return 'stderr' in result && 'stdout' in result && 'status' in result;
}

export class InstalledDependencyVersionCheck implements DoctorCheck {
  description = 'Checking dependency versions for compatibility with the installed Expo SDK';

  async runAsync({ projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];
    const advice: string[] = [];

    try {
      // only way to check dependencies without automatically fixing them is to use interactive prompt
      // In the future, we should add JSON output to npx expo install, check for support, and use that instead
      await spawnAsync('sh', ['-c', 'echo "n" | npx expo install --check'], {
        stdio: 'pipe',
        cwd: projectRoot,
      });
    } catch (error: any) {
      if (isSpawnResult(error)) {
        issues.push(error.stderr.trim());
        advice.push(`Use npx expo install --check to review and upgrade your dependencies.`);
      } else {
        throw error;
      }
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
      advice,
    };
  }
}
