#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'path';

import * as Android from './Android';
import * as Ios from './Ios';
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
  .option(
    '--manifest-path <string>',
    "Custom path to use for an Android project's AndroidManifest.xml"
  )
  .option('--info-path <string>', "Custom path to use for an iOS project's Info.plist")
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
  .option(
    '--manifest-path <string>',
    "Custom path to use for an Android project's AndroidManifest.xml"
  )
  .option('--info-path <string>', "Custom path to use for an iOS project's Info.plist")
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
  .option(
    '--manifest-path <string>',
    "Custom path to use for an Android project's AndroidManifest.xml"
  )
  .action(async (uri: string, args: any) => {
    try {
      const options = await parseArgsAsync(uri, args);
      await URIScheme.openAsync(options);
      shouldUpdate();
    } catch (error) {
      commandDidThrowAsync(error);
    }
  });

buildCommand('list')
  .description('List the existing URI scheme prefixes for a native app')
  .option(
    '--manifest-path <string>',
    "Custom path to use for an Android project's AndroidManifest.xml"
  )
  .option('--info-path <string>', "Custom path to use for an iOS project's Info.plist")
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
  const projectRoot = resolve(process.cwd());
  options.projectRoot = projectRoot;
  if (options.manifestPath) options.manifestPath = resolve(options.manifestPath);
  if (options.infoPath) options.infoPath = resolve(options.infoPath);

  const platforms = URIScheme.getAvailablePlatforms(options);

  if (!options.android && !options.ios) {
    for (const key of platforms) {
      // @ts-ignore: Set iOS and Android props.
      options[key] = true;
    }
  } else {
    if (options.android) {
      if (!platforms.includes('android')) {
        throw new CommandError(
          `Android project not found in directory "${projectRoot}".\nYou can manually select an AndroidManifest.xml with \`--manifest-path\``
        );
      }
    }
    if (options.ios) {
      if (!platforms.includes('ios')) {
        throw new CommandError(
          `iOS project not found in directory "${projectRoot}".\nYou can manually select an Info.plist with \`--info-path\``
        );
      }
    }
  }

  if (options.android && !options.manifestPath) {
    options.manifestPath = Android.getConfigPath(projectRoot);
  }
  if (options.ios && !options.infoPath) {
    options.infoPath = Ios.getConfigPath(projectRoot);
  }

  options.uri = uri;
  return options;
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
