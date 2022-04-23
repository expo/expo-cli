import JsonFile from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import semver from 'semver';

import CommandError from '../../CommandError';
import Log from '../../log';

export async function findProjectRootAsync(
  base: string
): Promise<{ projectRoot: string; workflow: 'managed' | 'bare' }> {
  let previous = null;
  let dir = base;

  do {
    try {
      // This will throw if there is no package.json in the directory
      const pkg = await JsonFile.readAsync(path.join(dir, 'package.json'));
      const hasReactNativeUnimodules = pkg.dependencies?.hasOwnProperty('react-native-unimodules');
      const hasExpo = pkg.dependencies?.hasOwnProperty('expo');
      const isManaged = hasExpo && !hasReactNativeUnimodules;
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

/** Returns true if `expo-updates` is in the `package.json` dependencies. */
export async function hasExpoUpdatesInstalledAsync(projectRoot: string): Promise<boolean> {
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkgExists = fs.existsSync(pkgPath);

  if (!pkgExists) {
    return false;
  }

  const dependencies = await JsonFile.getAsync(pkgPath, 'dependencies', {});
  return !!dependencies['expo-updates'];
}

// If we get here and can't find expo-updates or package.json we just assume
// that we are not using the old expo-updates
export async function usesOldExpoUpdatesAsync(projectRoot: string): Promise<boolean> {
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkgExists = fs.existsSync(pkgPath);

  if (!pkgExists) {
    return false;
  }

  const dependencies = await JsonFile.getAsync(pkgPath, 'dependencies', {});
  if (!dependencies['expo-updates']) {
    return false;
  }

  const version = dependencies['expo-updates'] as string;
  const coercedVersion = semver.coerce(version);
  if (coercedVersion && semver.satisfies(coercedVersion, '~0.1.0')) {
    return true;
  }

  return false;
}

export async function validateGitStatusAsync(): Promise<boolean> {
  let workingTreeStatus = 'unknown';
  try {
    const result = await spawnAsync('git', ['status', '--porcelain']);
    workingTreeStatus = result.stdout === '' ? 'clean' : 'dirty';
  } catch {
    // Maybe git is not installed?
    // Maybe this project is not using git?
  }

  if (workingTreeStatus === 'clean') {
    Log.nested(`Your git working tree is ${chalk.green('clean')}`);
    Log.nested('To revert the changes after this command completes, you can run the following:');
    Log.nested('  git clean --force && git reset --hard');
    return true;
  } else if (workingTreeStatus === 'dirty') {
    Log.nested(`${chalk.bold('Warning!')} Your git working tree is ${chalk.red('dirty')}.`);
    Log.nested(
      `It's recommended to ${chalk.bold(
        'commit all your changes before proceeding'
      )}, so you can revert the changes made by this command if necessary.`
    );
  } else {
    Log.nested("We couldn't find a git repository in your project directory.");
    Log.nested("It's recommended to back up your project before proceeding.");
  }

  return false;
}
