import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import chalk from 'chalk';

import { logNewSection } from '../utils/ora';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

function isSpawnResult(result: any): result is SpawnResult {
  return 'stderr' in result && 'stdout' in result && 'status' in result;
}

export default class InstalledDependencyVersionCheck implements DoctorCheck {
  description = 'Checking dependency versions for compatibility with installed SDK...';

  async runAsync({ projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    // dependency check
    const ora = logNewSection(`Checking versions...`);

    try {
      await spawnAsync('sh', ['-c', 'echo "n" | npx expo install --check'], {
        stdio: 'pipe',
        cwd: projectRoot,
      });
    } catch (error: any) {
      if (isSpawnResult(error)) {
        console.log(chalk.yellow(error.stderr));
        issues.push(`One or more packages are incompatible with your Expo SDK version.`);
      } else {
        throw error;
      }
    } finally {
      ora.stop();
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
