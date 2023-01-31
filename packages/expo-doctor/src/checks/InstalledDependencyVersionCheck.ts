import spawnAsync, { SpawnResult } from '@expo/spawn-async';

import { logNewSection } from '../utils/ora';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

function isSpawnResult(result: any): result is SpawnResult {
  return 'stderr' in result && 'stdout' in result && 'status' in result;
}

export default class InstalledDependencyVersionCheck implements DoctorCheck {
  description = 'Checking dependency versions for compatibility with the installed Expo SDK';

  async runAsync({ projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];
    const advice: string[] = [];

    // dependency check
    const ora = logNewSection(`Checking versions...`);

    try {
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
    } finally {
      ora.stop();
    }

    return {
      isSuccessful: advice.length === 0,
      issues,
      advice,
    };
  }
}
