import spawnAsync from '@expo/spawn-async';

interface GitStatusOptions {
  showUntracked?: boolean;
}

async function gitStatusAsync({ showUntracked }: GitStatusOptions = {}): Promise<string> {
  return (await spawnAsync('git', ['status', '-s', showUntracked ? '-uall' : '-uno'])).stdout;
}

async function gitDiffAsync(): Promise<void> {
  await spawnAsync('git', ['--no-pager', 'diff'], { stdio: ['ignore', 'inherit', 'inherit'] });
}

async function gitAddAsync(file: string, options?: { intentToAdd?: boolean }): Promise<void> {
  if (options?.intentToAdd) {
    await spawnAsync('git', ['add', '--intent-to-add', file]);
  } else {
    await spawnAsync('git', ['add', file]);
  }
}

async function gitDoesRepoExistAsync(): Promise<boolean> {
  try {
    await spawnAsync('git', ['rev-parse', '--git-dir']);
    return true;
  } catch (err) {
    return false;
  }
}

async function gitRootDirectory(): Promise<string> {
  return (await spawnAsync('git', ['rev-parse', '--show-toplevel'])).stdout.trim();
}

export { gitStatusAsync, gitDiffAsync, gitAddAsync, gitDoesRepoExistAsync, gitRootDirectory };
