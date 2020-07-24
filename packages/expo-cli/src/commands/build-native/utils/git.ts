import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import ora from 'ora';

import prompts from '../../../prompts';

async function ensureGitStatusIsCleanAsync(): Promise<void> {
  const changes = (await spawnAsync('git', ['status', '-s', '-uno'])).stdout;
  if (changes.length > 0) {
    throw new Error('Please commit all changes before building your project. Aborting...');
  }
}

async function makeProjectTarballAsync(tarPath: string): Promise<number> {
  const spinner = ora('Making project tarball').start();
  await spawnAsync('git', [
    'archive',
    '--format=tar.gz',
    '--prefix',
    'project/',
    '-o',
    tarPath,
    'HEAD',
  ]);
  spinner.succeed('Project tarball created.');

  const { size } = await fs.stat(tarPath);
  return size;
}

async function showDiff(): Promise<void> {
  await spawnAsync('git', ['--no-pager', 'diff'], { stdio: ['ignore', 'inherit', 'inherit'] });
}

async function commitChangesAsync(commitMessage?: string): Promise<void> {
  if (!commitMessage) {
    const promptResult = await prompts({
      type: 'text',
      name: 'message',
      message: 'Commit message:',
      initial: 'Configure Xcode project',
      validate: input => input !== '',
    });
    commitMessage = promptResult.message as string;
  }

  // add changed files only
  await spawnAsync('git', ['add', '-u']);
  await spawnAsync('git', ['commit', '-m', commitMessage]);
}

export { ensureGitStatusIsCleanAsync, makeProjectTarballAsync, commitChangesAsync, showDiff };
