import JsonFile from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

import CommandError from '../../CommandError';
import log from '../../log';

export async function findProjectRootAsync(
  base: string
): Promise<{ projectRoot: string; workflow: 'managed' | 'bare' }> {
  let previous = null;
  let dir = base;

  do {
    if (await JsonFile.getAsync(path.join(dir, 'app.json'), 'expo', null)) {
      return { projectRoot: dir, workflow: 'managed' };
    } else if (fs.existsSync(path.join(dir, 'package.json'))) {
      return { projectRoot: dir, workflow: 'bare' };
    }
    previous = dir;
    dir = path.dirname(dir);
  } while (dir !== previous);

  throw new CommandError(
    'NO_PROJECT',
    'No managed or bare projects found. Please make sure you are inside a project folder.'
  );
}

export async function validateGitStatusAsync(): Promise<boolean> {
  let workingTreeStatus = 'unknown';
  try {
    let result = await spawnAsync('git', ['status', '--porcelain']);
    workingTreeStatus = result.stdout === '' ? 'clean' : 'dirty';
  } catch (e) {
    // Maybe git is not installed?
    // Maybe this project is not using git?
  }

  if (workingTreeStatus === 'clean') {
    log.nested(`Your git working tree is ${chalk.green('clean')}`);
    log.nested('To revert the changes after this command completes, you can run the following:');
    log.nested('  git clean --force && git reset --hard');
    return true;
  } else if (workingTreeStatus === 'dirty') {
    log.nested(`${chalk.bold('Warning!')} Your git working tree is ${chalk.red('dirty')}.`);
    log.nested(
      `It's recommended to ${chalk.bold(
        'commit all your changes before proceeding'
      )},\nso you can revert the changes made by this command if necessary.`
    );
  } else {
    log.nested("We couldn't find a git repository in your project directory.");
    log.nested("It's recommended to back up your project before proceeding.");
  }

  return false;
}
