import spawnAsync from '@expo/spawn-async';
import path from 'path';

import Log from '../../../log';

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getGradleTask(buildVariant: string): string {
  return `install${capitalize(buildVariant)}`;
}

function resolveGradleWPath(androidProjectPath: string): string {
  return path.join(androidProjectPath, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
}

export async function spawnGradleTaskAsync({
  androidProjectPath,
  buildVariant,
}: {
  androidProjectPath: string;
  buildVariant: string;
}) {
  const gradlew = resolveGradleWPath(androidProjectPath);
  const task = getGradleTask(buildVariant);
  Log.debug(`  ${gradlew} ${task}`);
  await spawnAsync(gradlew, [task], {
    cwd: androidProjectPath,
    stdio: 'inherit',
  });
}
