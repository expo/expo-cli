#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'path';
// @ts-ignore: expo-optimize is not listed in its own dependencies

import { isProjectOptimized as isProjectOptimizedAsync, optimizeAsync } from './assets';
import shouldUpdate from './update';

const packageJSON = require('../package.json');

let projectDirectory: string = '';

const program = new Command(packageJSON.name)
  .version(packageJSON.version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .description('Compress the assets in your Expo project')
  // TODO: (verbose option): log the include, exclude options
  .option('-s, --save', 'Save the original assets with a .orig extension')
  .option(
    '-q, --quality [number]',
    'Specify the quality the compressed image is reduced to. Default is 80'
  )
  .option(
    '-i, --include [pattern]',
    'Include only assets that match this glob pattern relative to the project root'
  )
  .option(
    '-e, --exclude [pattern]',
    'Exclude all assets that match this glob pattern relative to the project root'
  )
  .action((inputProjectDirectory: string) => (projectDirectory = inputProjectDirectory))
  .allowUnknownOption()
  .parse(process.argv);

async function run() {
  // Space out first line
  console.log();

  if (typeof projectDirectory === 'string') {
    projectDirectory = projectDirectory.trim();
  }

  const resolvedProjectRoot = resolve(projectDirectory);

  const optimizationOptions = {
    save: program.save,
    include: program.include,
    exclude: program.exclude,
    quality: parseQuality(),
  };

  const isProjectOptimized = await isProjectOptimizedAsync(
    resolvedProjectRoot,
    optimizationOptions
  );
  if (!program.save && !isProjectOptimized) {
    console.warn(chalk.bgYellow.black('This will overwrite the original assets.'));
  }
  await optimizeAsync(resolvedProjectRoot, optimizationOptions);
}

function parseQuality(): number | undefined {
  //   const defaultQuality = 80;
  if (program.quality == null) {
    return undefined;
  }
  const quality = Number(program.quality);
  if (!(Number.isInteger(quality) && quality > 0 && quality <= 100)) {
    throw new Error('Invalid value for --quality flag. Must be an integer between 1 and 100.');
  }
  return quality;
}

run()
  .then(shouldUpdate)
  .catch(async reason => {
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
  });
