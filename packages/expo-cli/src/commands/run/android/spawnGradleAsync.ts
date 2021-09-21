import spawnAsync from '@expo/spawn-async';
import path from 'path';

import { AbortCommandError } from '../../../CommandError';
import Log from '../../../log';

function upperFirst(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatGradleArguments(
  cmd: 'assemble' | 'install',
  {
    appName,
    variant,
    tasks = [cmd + upperFirst(variant)],
  }: { tasks?: string[]; variant: string; appName: string }
) {
  return appName ? tasks.map(task => `${appName}:${task}`) : tasks;
}

function resolveGradleWPath(androidProjectPath: string): string {
  return path.join(androidProjectPath, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
}

function getPortArg(port: number) {
  return `-PreactNativeDevServerPort=${port}`;
}

export async function assembleAsync({
  androidProjectPath,
  variant,
  port,
  appName,
}: {
  androidProjectPath: string;
  variant: string;
  port?: number;
  appName: string;
}) {
  const task = formatGradleArguments('assemble', { variant, appName });
  const args = [
    ...task,
    // ignore linting errors
    '-x',
    'lint',
    // ignore tests
    '-x',
    'test',
    '--configure-on-demand',
  ];
  if (port) args.push(getPortArg(port));

  // Generate a profile under `/android/app/build/reports/profile`
  if (Log.isProfiling) args.push('--profile');

  return await spawnGradleAsync(androidProjectPath, { port, args });
}

export async function installAsync({
  androidProjectPath,
  variant,
  appName,
  port,
}: {
  androidProjectPath: string;
  variant: string;
  appName: string;
  port?: number;
}) {
  const args = formatGradleArguments('install', { variant, appName });
  return await spawnGradleAsync(androidProjectPath, { port, args });
}

export async function spawnGradleAsync(
  projectRoot: string,
  { port, args }: { port?: number; args: string[] }
) {
  const gradlew = resolveGradleWPath(projectRoot);
  if (port) args.push(getPortArg(port));
  Log.debug(`  ${gradlew} ${args.join(' ')}`);
  try {
    return await spawnAsync(gradlew, args, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error: any) {
    // User aborted the command with ctrl-c
    if (error.status === 130) {
      // Fail silently
      throw new AbortCommandError();
    }
    throw error;
  }
}
