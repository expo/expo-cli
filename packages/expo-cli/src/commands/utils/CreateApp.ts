import * as PackageManager from '@expo/package-manager';
import program from 'commander';
import fs from 'fs-extra';
import getenv from 'getenv';
import yaml from 'js-yaml';
import ora from 'ora';
import * as path from 'path';
import semver from 'semver';

import log from '../../log';

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
    log.addNewLineIfNone();
    log.nested(`The directory ${log.chalk.green(folderName)} has files that might be overwritten:`);
    log.newLine();
    for (const file of conflicts) {
      log.nested(`  ${file}`);
    }

    if (overwrite) {
      log.newLine();
      log.nested(`Removing existing files from ${log.chalk.green(folderName)}`);
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
    log.addNewLineIfNone();
    log(
      packageManager === 'yarn'
        ? '🧶 Using Yarn to install packages. You can pass --npm to use npm instead.'
        : '📦 Using npm to install packages.'
    );
    log.newLine();
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
        log.warn(
          `Yarn v${version} detected, enabling experimental Yarn v2 support using the node-modules plugin.`
        );
      !flags.silent && log(`Writing ${yarnRc}...`);
      fs.writeFileSync(yarnRc, yaml.safeDump(config));
    }
    await yarn.installAsync();
  } else {
    await new PackageManager.NpmPackageManager(options).installAsync();
  }
}

export function logNewSection(title: string) {
  const spinner = ora(log.chalk.bold(title));
  // respect loading indicators
  log.setSpinner(spinner);
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
  log.addNewLineIfNone();
  let step = logNewSection('Installing CocoaPods.');
  if (process.platform !== 'darwin') {
    step.succeed('Skipped installing CocoaPods because operating system is not on macOS.');
    return false;
  }
  const packageManager = new PackageManager.CocoaPodsPackageManager({
    cwd: path.join(projectRoot, 'ios'),
    log,
    silent: !EXPO_DEBUG,
  });

  if (!(await packageManager.isCLIInstalledAsync())) {
    try {
      // prompt user -- do you want to install cocoapods right now?
      step.text = 'CocoaPods CLI not found in your PATH, installing it now.';
      step.render();
      await PackageManager.CocoaPodsPackageManager.installCLIAsync({
        nonInteractive: program.nonInteractive,
        spawnOptions: packageManager.options,
      });
      step.succeed('Installed CocoaPods CLI');
      step = logNewSection('Running `pod install` in the `ios` directory.');
    } catch (e) {
      step.stopAndPersist({
        symbol: '⚠️ ',
        text: log.chalk.red(
          'Unable to install the CocoaPods CLI. Continuing with project sync, you can install CocoaPods afterwards.'
        ),
      });
      if (e.message) {
        log(`- ${e.message}`);
      }
      return false;
    }
  }

  try {
    await packageManager.installAsync();
    step.succeed('Installed pods and initialized Xcode workspace.');
    return true;
  } catch (e) {
    step.stopAndPersist({
      symbol: '⚠️ ',
      text: log.chalk.red(
        'Something went wrong running `pod install` in the `ios` directory. Continuing with project sync, you can debug this afterwards.'
      ),
    });
    if (e.message) {
      log(`- ${e.message}`);
    }
    return false;
  }
}
