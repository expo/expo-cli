import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import commandExists from 'command-exists';
import figures from 'figures';
import fs from 'fs-extra';
import ora from 'ora';

import CommandError from '../../../CommandError';
import {
  gitDiffAsync,
  gitDoesRepoExistAsync,
  gitRootDirectory,
  gitStatusAsync,
} from '../../../git';
import log from '../../../log';
import prompts, { confirmAsync } from '../../../prompts';

async function ensureGitRepoExistsAsync(): Promise<void> {
  try {
    await commandExists('git');
  } catch (err) {
    throw new Error('git command has not been found, install it before proceeding');
  }

  if (await gitDoesRepoExistAsync()) {
    return;
  }

  log(log.chalk.yellow("It looks like you haven't initialized the git repository yet."));
  log(log.chalk.yellow('EAS Build requires you to use a git repository for your project.'));

  const confirmInit = await confirmAsync({
    message: `Would you like to run 'git init' in the current directory?`,
  });
  if (!confirmInit) {
    throw new Error(
      'A git repository is required for building your project. Initialize it and run this command again.'
    );
  }
  await spawnAsync('git', ['init']);

  log("We're going to make an initial commit for you repository.");

  const { message } = await prompts({
    type: 'text',
    name: 'message',
    message: 'Commit message:',
    initial: 'Initial commit',
    validate: input => input !== '',
  });
  await spawnAsync('git', ['add', '-A']);
  await spawnAsync('git', ['commit', '-m', message]);
}

async function ensureGitStatusIsCleanAsync(): Promise<void> {
  const changes = await gitStatusAsync();
  if (changes.length > 0) {
    throw new DirtyGitTreeError(
      'Please commit all changes before building your project. Aborting...'
    );
  }
}

class DirtyGitTreeError extends Error {}

async function makeProjectTarballAsync(tarPath: string): Promise<number> {
  const spinner = ora('Making project tarball').start();
  await spawnAsync(
    'git',
    ['archive', '--format=tar.gz', '--prefix', 'project/', '-o', tarPath, 'HEAD'],
    { cwd: await gitRootDirectory() }
  );
  spinner.succeed('Project tarball created.');

  const { size } = await fs.stat(tarPath);
  return size;
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
  await gitDiffAsync();
  log.newLine();

  const confirm = await confirmAsync({
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

async function modifyAndCommitAsync(
  callback: () => Promise<void>,
  {
    startMessage,
    successMessage,
    commitMessage,
    commitSuccessMessage,
    nonInteractive,
  }: {
    startMessage: string;
    successMessage: string;
    commitMessage: string;
    commitSuccessMessage: string;
    nonInteractive: boolean;
  }
) {
  const spinner = ora(startMessage);

  try {
    await callback();

    await ensureGitStatusIsCleanAsync();

    spinner.succeed();
  } catch (err) {
    if (err instanceof DirtyGitTreeError) {
      spinner.succeed(successMessage);
      log.newLine();

      try {
        await reviewAndCommitChangesAsync(commitMessage, {
          nonInteractive,
        });

        log(`${chalk.green(figures.tick)} ${commitSuccessMessage}.`);
      } catch (e) {
        throw new Error(
          "Aborting, run the command again once you're ready. Make sure to commit any changes you've made."
        );
      }
    } else {
      spinner.fail();
      throw err;
    }
  }
}

export {
  DirtyGitTreeError,
  ensureGitRepoExistsAsync,
  ensureGitStatusIsCleanAsync,
  makeProjectTarballAsync,
  reviewAndCommitChangesAsync,
  modifyAndCommitAsync,
};
