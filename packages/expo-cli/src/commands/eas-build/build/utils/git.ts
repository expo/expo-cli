import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import ora from 'ora';

import CommandError from '../../../../CommandError';
import log from '../../../../log';
import prompts from '../../../../prompts';

async function ensureGitStatusIsCleanAsync(): Promise<void> {
  const changes = (await spawnAsync('git', ['status', '-s', '-uno'])).stdout;
  if (changes.length > 0) {
    throw new DirtyGitTreeError(
      'Please commit all changes before building your project. Aborting...'
    );
  }
}

class DirtyGitTreeError extends Error {}

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

async function showDiffAsync(): Promise<void> {
  await spawnAsync('git', ['--no-pager', 'diff'], { stdio: ['ignore', 'inherit', 'inherit'] });
}

async function addFileAsync(file: string, options?: { intentToAdd?: boolean }): Promise<void> {
  if (options?.intentToAdd) {
    await spawnAsync('git', ['add', '--intent-to-add', file]);
  } else {
    await spawnAsync('git', ['add', file]);
  }
}

async function reviewAndCommitChangesAsync(
  commitMessage: string,
  { nonInteractive }: { nonInteractive: boolean }
): Promise<void> {
  if (nonInteractive) {
    throw new CommandError(
      'Cannot commit changes when --non-interactive is specified. Run the command in interactive mode to review and commit changes.'
    );
  }

  log('Please review the following changes and pass the message to make the commit.');
  log.newLine();
  await showDiffAsync();
  log.newLine();

  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Can we commit these changes for you?',
  });

  if (!confirm) {
    throw new Error('Aborting commit. Please review and commit the changes manually.');
  }

  const { message } = await prompts({
    type: 'text',
    name: 'message',
    message: 'Commit message:',
    initial: commitMessage,
    validate: input => input !== '',
  });

  // Add changed files only
  await spawnAsync('git', ['add', '-u']);
  await spawnAsync('git', ['commit', '-m', message]);
}

export {
  DirtyGitTreeError,
  ensureGitStatusIsCleanAsync,
  makeProjectTarballAsync,
  reviewAndCommitChangesAsync,
  showDiffAsync,
  addFileAsync,
};
