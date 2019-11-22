#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'path';

import shouldUpdate from './update';

let projectDirectory: string = '';

const packageJson = () => require('@expo/next-adapter/package.json');

import { runAsync } from '../customize';

const program = new Command(packageJson().name)
  .version(packageJson().version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .description('Generate static Next.js files into your project.')
  .option('-c, --customize', 'Select template files you want to add to your project')
  .option('-f, --force', 'Allows replacing existing files')
  .action(
    (inputProjectDirectory: string, options: any) => (projectDirectory = inputProjectDirectory)
  )
  .allowUnknownOption()
  .parse(process.argv);

async function run() {
  if (typeof projectDirectory === 'string') {
    projectDirectory = projectDirectory.trim();
  }

  const resolvedProjectRoot = resolve(projectDirectory);

  runAsync({ projectRoot: resolvedProjectRoot, force: program.force, yes: !program.customize });
}

run()
  .then(shouldUpdate)
  .catch(async reason => {
    console.log();
    console.log('Aborting installation.');
    if (reason.command) {
      console.log(`  ${chalk.magenta(reason.command)} has failed.`);
    } else {
      console.log(chalk.red('An unexpected error was encountered. Please report it as a bug:'));
      console.log(reason);
    }
    console.log();

    await shouldUpdate();

    process.exit(1);
  });
