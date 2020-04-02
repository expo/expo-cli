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
  .option('--non-interactive', 'Disable interactive prompts')
  .action((inputProjectRoot: string) => (projectRoot = inputProjectRoot))
  .allowUnknownOption()
  .parse(process.argv);

async function runAsync(): Promise<void> {
  if (typeof projectRoot === 'string') {
    projectRoot = projectRoot.trim();
  }
  projectRoot = resolve(projectRoot);

  if (process.platform !== 'darwin') {
    console.log(chalk.red('CocoaPods is only supported on darwin machines'));
    return;
  }
  if (!CocoaPodsPackageManager.isUsingPods(projectRoot)) {
    console.log(chalk.yellow('CocoaPods is not supported in this project'));
    return;
  }

  if (!(await CocoaPodsPackageManager.isCLIInstalledAsync())) {
    await CocoaPodsPackageManager.installCLIAsync({ nonInteractive: program.nonInteractive });
  }
  const manager = new CocoaPodsPackageManager({ cwd: projectRoot });
  await manager.installAsync();
}

(async () => {
  program.parse(process.argv);
  console.log('Scanning for pods...');
  try {
    await runAsync();
    await shouldUpdate();
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
    await shouldUpdate();
    process.exit(1);
  }
})();
