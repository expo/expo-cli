import spawnAsync from '@expo/spawn-async';

interface GitStatusOptions {
  showUntracked?: boolean;
}

export async function gitStatusAsync({ showUntracked }: GitStatusOptions = {}): Promise<string> {
  return (await spawnAsync('git', ['status', '-s', showUntracked ? '-uall' : '-uno'])).stdout;
}

export async function gitDiffAsync(): Promise<void> {
  await spawnAsync('git', ['--no-pager', 'diff'], { stdio: ['ignore', 'inherit', 'inherit'] });
}

export async function gitAddAsync(
  file: string,
  options?: { intentToAdd?: boolean }
): Promise<void> {
  if (options?.intentToAdd) {
    await spawnAsync('git', ['add', '--intent-to-add', file]);
  } else {
    await spawnAsync('git', ['add', file]);
  }
}
