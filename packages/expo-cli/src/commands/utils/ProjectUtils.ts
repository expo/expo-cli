import JsonFile from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
import { getConfig } from '@expo/config';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import semver from 'semver';

import CommandError from '../../CommandError';
import log from '../../log';

export async function findProjectRootAsync(
  base: string
): Promise<{ projectRoot: string; workflow: 'managed' | 'bare' }> {
  let previous = null;
  let dir = base;

  do {
    try {
      // This will throw if there is no package.json in the directory
      const { pkg, dynamicConfigPath, staticConfigPath } = getConfig(dir, {
        skipSDKVersionRequirement: true,
      });

      const dirIncludesAppConfig = dynamicConfigPath || staticConfigPath;
      const isManaged =
        dirIncludesAppConfig && !pkg.dependencies.hasOwnProperty('react-native-unimodules');
      const workflow = isManaged ? 'managed' : 'bare';

      return { projectRoot: dir, workflow };
    } catch {
      // Expected to throw if no package.json is present
    } finally {
      previous = dir;
      dir = path.dirname(dir);
    }
  } while (dir !== previous);

  throw new CommandError(
    'NO_PROJECT',
    'No managed or bare projects found. Please make sure you are inside a project folder.'
  );
}

// If we get here and can't find expo-updates or package.json we just assume
// that we are not using the old expo-updates
export async function usesOldExpoUpdatesAsync(projectRoot: string): Promise<boolean> {
  let pkgPath = path.join(projectRoot, 'package.json');
  let pkgExists = fs.existsSync(pkgPath);

  if (!pkgExists) {
    return false;
  }

  let dependencies = await JsonFile.getAsync(pkgPath, 'dependencies', {});
  if (!dependencies['expo-updates']) {
    return false;
  }

  let version = dependencies['expo-updates'] as string;
  let coercedVersion = semver.coerce(version);
  if (coercedVersion && semver.satisfies(coercedVersion, '~0.1.0')) {
    return true;
  }

  return false;
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
      )}, so you can revert the changes made by this command if necessary.`
    );
  } else {
    log.nested("We couldn't find a git repository in your project directory.");
    log.nested("It's recommended to back up your project before proceeding.");
  }

  return false;
}
