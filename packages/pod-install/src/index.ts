#!/usr/bin/env node

import { CocoaPodsPackageManager } from '@expo/package-manager/build/CocoaPodsPackageManager';
import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'path';

import shouldUpdate from './update';

const packageJSON = require('../package.json');

let projectRoot: string = '';

const program = new Command(packageJSON.name)
  .version(packageJSON.version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .description('Install pods in your project')
  .option('--quiet', 'Only print errors')
  .option('--non-interactive', 'Disable interactive prompts')
  .action((inputProjectRoot: string) => (projectRoot = inputProjectRoot))
  .allowUnknownOption()
  .parse(process.argv);

const info = (message: string) => {
  if (!program.quiet) {
    console.log(message);
  }
};

async function runAsync(): Promise<void> {
  if (typeof projectRoot === 'string') {
    projectRoot = projectRoot.trim();
  }
  projectRoot = resolve(projectRoot);

  if (process.platform !== 'darwin') {
    info(chalk.red('CocoaPods is only supported on darwin machines'));
    return;
  }

  const possibleProjectRoot = CocoaPodsPackageManager.getPodProjectRoot(projectRoot);
  if (!possibleProjectRoot) {
    info(chalk.yellow('CocoaPods is not supported in this project'));
    return;
  } else {
    projectRoot = possibleProjectRoot;
  }

  if (!(await CocoaPodsPackageManager.isCLIInstalledAsync())) {
    await CocoaPodsPackageManager.installCLIAsync({ nonInteractive: program.nonInteractive });
  }
  const manager = new CocoaPodsPackageManager({ cwd: projectRoot });
  await manager.installAsync();
}

(async () => {
  program.parse(process.argv);
  info('Scanning for pods...');
  try {
    await runAsync();
    if (!program.quiet) {
      await shouldUpdate();
    }
  } catch (reason) {
    console.log();
    console.log('Aborting run');
    if (reason.command) {
      console.log(`  ${chalk.magenta(reason.command)} has failed.`);
    } else {
      console.log(chalk.red`An unexpected error was encountered. Please report it as a bug:`);
      console.log(reason);
    }
    console.log();
    if (!program.quiet) {
      await shouldUpdate();
    }
    process.exit(1);
  }
})();
