#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';

import { CommandError, Options } from './Options';
import shouldUpdate from './update';
import * as URIScheme from './URIScheme';

const packageJson = () => require('../package.json');

export const program = new Command(packageJson().name).version(packageJson().version);

function buildCommand(name: string, examples: string[] = []): Command {
  return program
    .command(`${name} [uri-protocol]`)
    .option('-a, --android', 'Apply action to Android')
    .option('-i, --ios', 'Apply action to iOS ')
    .on('--help', () => {
      if (!examples.length) return;
      console.log();
      console.log('Examples:');
      console.log();
      for (const example of examples) {
        console.log(`  $ uri-scheme ${name} ${example}`);
      }
      console.log();
    });
}

buildCommand('add', ['com.app', 'myapp'])
  .description('Add URI schemes to a native app')
  .option('-n, --name <string>', 'Name to use on iOS.')
  .option('-r, --role <string>', 'Role to use on iOS: Editor, Viewer')
  .option('--dry-run', 'View the proposed change')
  .action(async (uri: string, args: any) => {
    try {
      const options = await parseArgsAsync(uri, args);
      await URIScheme.addAsync(options);
      shouldUpdate();
    } catch (error) {
      commandDidThrowAsync(error);
    }
  });

buildCommand('remove', ['com.app', 'myapp'])
  .description('Remove URI schemes from a native app')
  .option('--dry-run', 'View the proposed change')
  .action(async (uri: string, args: any) => {
    try {
      const options = await parseArgsAsync(uri, args);
      await URIScheme.removeAsync(options);
      shouldUpdate();
    } catch (error) {
      commandDidThrowAsync(error);
    }
  });

buildCommand('open', ['com.app://oauth', 'http://expo.io'])
  .description('Open a URI scheme in a running simulator or emulator')
  .option('--package <string>', 'The Android package name to use when opening in an emulator.')
  .action(async (uri: string, args: any) => {
    try {
      if (!args.ios && !args.android) {
        throw new CommandError('Please provide a target platform with --ios or --android');
      }
      await URIScheme.openAsync({
        projectRoot: process.cwd(),
        ...args,
        uri,
      });
      shouldUpdate();
    } catch (error) {
      commandDidThrowAsync(error);
    }
  });

buildCommand('list')
  .description('List the existing URI scheme prefixes for a native app')
  .action(async (uri: string, args: any) => {
    try {
      const options = await parseArgsAsync(uri, args);
      await URIScheme.listAsync(options);
      shouldUpdate();
    } catch (error) {
      commandDidThrowAsync(error);
    }
  });

async function parseArgsAsync(uri: string, options: Options): Promise<Options> {
  const projectRoot = process.cwd();
  let platforms = URIScheme.getAvailablePlatforms(projectRoot);

  if (!options.android && !options.ios) {
    for (const key of platforms) {
      // @ts-ignore: Set iOS and Android props.
      options[key] = true;
    }
  } else {
    if (options.android) {
      if (!platforms.includes('android')) {
        throw new CommandError('Android not supported');
      }
    }
    if (options.ios) {
      if (!platforms.includes('ios')) {
        throw new CommandError('iOS not supported');
      }
    }
  }

  return {
    ...options,
    uri,
    projectRoot,
  };
}

export function run() {
  program.parse(process.argv);
}

async function commandDidThrowAsync(reason: any) {
  console.log();
  if (reason.command) {
    console.log(
      chalk.red(`\u203A ${chalk.bold(`npx ${packageJson().name} ${reason.command}`)} has failed.`)
    );
    console.log();
  }
  if (reason.origin === 'uri-scheme') {
    console.log(chalk.black.bgRed(reason.message));
  } else {
    console.log('Aborting run');

    console.log(chalk.black.bgRed`An unexpected error was encountered. Please report it as a bug:`);
    console.log(reason);
  }
  console.log();

  await shouldUpdate();

  process.exit(1);
}
