import * as PackageManager from '@expo/package-manager';
import chalk from 'chalk';
import fs from 'fs-extra';
import getenv from 'getenv';
import yaml from 'js-yaml';
import * as path from 'path';
import semver from 'semver';

import Log from '../../log';
import { ora } from '../../utils/ora';
import { hasPackageJsonDependencyListChangedAsync } from '../run/ios/Podfile';

export function validateName(name?: string): string | true {
  if (typeof name !== 'string' || name === '') {
    return 'The project name can not be empty.';
  }
  if (!/^[a-z0-9@.\-_]+$/i.test(name)) {
    return 'The project name can only contain URL-friendly characters (alphanumeric and @ . -  _)';
  }
  return true;
}

// Any of these files are allowed to exist in the projectRoot
const TOLERABLE_FILES = [
  // System
  '.DS_Store',
  'Thumbs.db',
  // Git
  '.git',
  '.gitattributes',
  '.gitignore',
  // Project
  '.npmignore',
  '.travis.yml',
  'LICENSE',
  'docs',
  '.idea',
  // Package manager
  'npm-debug.log',
  'yarn-debug.log',
  'yarn-error.log',
];

export function getConflictsForDirectory(
  projectRoot: string,
  tolerableFiles: string[] = TOLERABLE_FILES
): string[] {
  return fs
    .readdirSync(projectRoot)
    .filter((file: string) => !(/\.iml$/.test(file) || tolerableFiles.includes(file)));
}

export async function assertFolderEmptyAsync({
  projectRoot,
  folderName = path.dirname(projectRoot),
  overwrite,
}: {
  projectRoot: string;
  folderName?: string;
  overwrite: boolean;
}): Promise<boolean> {
  const conflicts = getConflictsForDirectory(projectRoot);
  if (conflicts.length) {
    Log.addNewLineIfNone();
    Log.nested(`The directory ${Log.chalk.green(folderName)} has files that might be overwritten:`);
    Log.newLine();
    for (const file of conflicts) {
      Log.nested(`  ${file}`);
    }

    if (overwrite) {
      Log.newLine();
      Log.nested(`Removing existing files from ${Log.chalk.green(folderName)}`);
      await Promise.all(conflicts.map(conflict => fs.remove(path.join(projectRoot, conflict))));
      return true;
    }

    return false;
  }
  return true;
}

export type PackageManagerName = 'npm' | 'yarn';

export function resolvePackageManager(options: {
  yarn?: boolean;
  npm?: boolean;
  install?: boolean;
}): PackageManagerName {
  let packageManager: PackageManagerName = 'npm';
  if (options.yarn || (!options.npm && PackageManager.shouldUseYarn())) {
    packageManager = 'yarn';
  } else {
    packageManager = 'npm';
  }
  if (options.install) {
    Log.log(
      packageManager === 'yarn'
        ? `🧶 Using Yarn to install packages. ${chalk.dim('Pass --npm to use npm instead.')}`
        : '📦 Using npm to install packages.'
    );
  }

  return packageManager;
}

const EXPO_DEBUG = getenv.boolish('EXPO_DEBUG', false);

export async function installNodeDependenciesAsync(
  projectRoot: string,
  packageManager: PackageManagerName,
  flags: { silent: boolean } = {
    // default to silent
    silent: !EXPO_DEBUG,
  }
) {
  const options = { cwd: projectRoot, silent: flags.silent };
  if (packageManager === 'yarn') {
    const yarn = new PackageManager.YarnPackageManager(options);
    const version = await yarn.versionAsync();
    const nodeLinker = await yarn.getConfigAsync('nodeLinker');
    if (semver.satisfies(version, '>=2.0.0-rc.24') && nodeLinker !== 'node-modules') {
      const yarnRc = path.join(projectRoot, '.yarnrc.yml');
      let yamlString = '';
      try {
        yamlString = fs.readFileSync(yarnRc, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      const config = yamlString ? yaml.safeLoad(yamlString) : {};
      config.nodeLinker = 'node-modules';
      !flags.silent &&
        Log.warn(
          `Yarn v${version} detected, enabling experimental Yarn v2 support using the node-modules plugin.`
        );
      !flags.silent && Log.log(`Writing ${yarnRc}...`);
      fs.writeFileSync(yarnRc, yaml.safeDump(config));
    }
    await yarn.installAsync();
  } else {
    await new PackageManager.NpmPackageManager(options).installAsync();
  }
}

export function logNewSection(title: string) {
  const spinner = ora(Log.chalk.bold(title));
  // respect loading indicators
  Log.setSpinner(spinner);
  spinner.start();
  return spinner;
}

export function getChangeDirectoryPath(projectRoot: string): string {
  const cdPath = path.relative(process.cwd(), projectRoot);
  if (cdPath.length <= projectRoot.length) {
    return cdPath;
  }
  return projectRoot;
}

export async function installCocoaPodsAsync(projectRoot: string) {
  let step = logNewSection('Installing CocoaPods...');
  if (process.platform !== 'darwin') {
    step.succeed('Skipped installing CocoaPods because operating system is not on macOS.');
    return false;
  }

  const packageManager = new PackageManager.CocoaPodsPackageManager({
    cwd: path.join(projectRoot, 'ios'),
    silent: !EXPO_DEBUG,
  });

  if (!(await packageManager.isCLIInstalledAsync())) {
    try {
      // prompt user -- do you want to install cocoapods right now?
      step.text = 'CocoaPods CLI not found in your PATH, installing it now.';
      step.stopAndPersist();
      await PackageManager.CocoaPodsPackageManager.installCLIAsync({
        nonInteractive: true,
        spawnOptions: {
          ...packageManager.options,
          // Don't silence this part
          stdio: ['inherit', 'inherit', 'pipe'],
        },
      });
      step.succeed('Installed CocoaPods CLI.');
      step = logNewSection('Running `pod install` in the `ios` directory.');
    } catch (e) {
      step.stopAndPersist({
        symbol: '⚠️ ',
        text: Log.chalk.red(
          'Unable to install the CocoaPods CLI. Continuing with project sync, you can install CocoaPods CLI afterwards.'
        ),
      });
      if (e instanceof PackageManager.CocoaPodsError) {
        Log.log(e.message);
      } else {
        Log.log(`Unknown error: ${e.message}`);
      }
      return false;
    }
  }

  try {
    await packageManager.installAsync({ spinner: step });
    // Create cached list for later
    await hasPackageJsonDependencyListChangedAsync(projectRoot).catch(() => null);
    step.succeed('Installed pods and initialized Xcode workspace.');
    return true;
  } catch (e) {
    step.stopAndPersist({
      symbol: '⚠️ ',
      text: Log.chalk.red(
        'Something went wrong running `pod install` in the `ios` directory. Continuing with project sync, you can debug this afterwards.'
      ),
    });
    if (e instanceof PackageManager.CocoaPodsError) {
      Log.log(e.message);
    } else {
      Log.log(`Unknown error: ${e.message}`);
    }
    return false;
  }
}
