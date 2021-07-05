import spawnAsync from '@expo/spawn-async';
import path from 'path';

import { AbortCommandError } from '../../../CommandError';
import Log from '../../../log';

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getGradleTask(variant: string): string {
  return `install${capitalize(variant)}`;
}

function resolveGradleWPath(androidProjectPath: string): string {
  return path.join(androidProjectPath, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
}

export async function spawnGradleAsync({
  androidProjectPath,
  variant,
}: {
  androidProjectPath: string;
  variant: string;
}) {
  const gradlew = resolveGradleWPath(androidProjectPath);
  const task = getGradleTask(variant);
  const args = [
    task,
    // ignore linting errors
    '-x',
    'lint',
    // ignore tests
    '-x',
    'test',
    '--configure-on-demand',
  ];
  if (Log.isProfiling) {
    // Generate a profile under `/android/app/build/reports/profile`
    args.push('--profile');
  }
  Log.debug(`  ${gradlew} ${args.join(' ')}`);
  try {
    return await spawnAsync(gradlew, args, {
      cwd: androidProjectPath,
      stdio: 'inherit',
    });
  } catch (error) {
    // User aborted the command with ctrl-c
    if (error.status === 130) {
      // Fail silently
      throw new AbortCommandError();
    }
    throw error;
  }
}
