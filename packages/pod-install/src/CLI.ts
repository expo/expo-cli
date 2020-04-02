import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'path';

import * as CocoaPods from './CocoaPods';
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
  .allowUnknownOption();

async function runAsync(): Promise<void> {
  if (typeof projectRoot === 'string') {
    projectRoot = projectRoot.trim();
  }
  projectRoot = resolve(projectRoot);

  if (process.platform !== 'darwin') {
    console.log(chalk.red('CocoaPods is only supported on darwin machines'));
    return;
  }
  if (!CocoaPods.projectSupportsCocoaPods(projectRoot)) {
    console.log(chalk.yellow('CocoaPods is not supported in this project'));
    return;
  }
  try {
    await spawnAsync('pod', ['--version']);
  } catch {
    await CocoaPods.installCocoaPodsAsync({ nonInteractive: program.nonInteractive });
  }
  await CocoaPods.podInstallAsync();
}

export async function startCLIAsync(): Promise<void> {
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
}
