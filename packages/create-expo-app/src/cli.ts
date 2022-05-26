#!/usr/bin/env node
import { Spec } from 'arg';
import chalk from 'chalk';

import { Log } from './log';
import { assertWithOptionsArgs, printHelp, resolveStringOrBooleanArgsAsync } from './utils/args';

const debug = require('debug')('expo:init:cli') as typeof console.log;

async function run() {
  const argv = process.argv.slice(2) ?? [];
  const rawArgsMap: Spec = {
    // Types
    '--yes': Boolean,
    '--no-install': Boolean,
    '--help': Boolean,
    '--version': Boolean,
    // Aliases
    '-y': '--yes',
    '-h': '--help',
    '-v': '--version',
  };
  const args = assertWithOptionsArgs(rawArgsMap, {
    argv,
    permissive: true,
  });

  if (args['--version']) {
    Log.exit(require('../package.json').version, 0);
  }

  if (args['--help']) {
    printHelp(
      `Creates a new Expo project`,
      chalk`npx create-expo-app {cyan <path>} [options]`,
      [
        `-y, --yes             Use the default options for creating a project`,
        `--no-install          Skip installing npm packages or CocoaPods`,
        chalk`-t, --template {gray [pkg]}  NPM template to use: blank, tabs, bare-minimum. Default: blank`,
        `-v, --version         Version number`,
        `-h, --help            Usage info`,
      ].join('\n'),
      chalk`
    {gray To choose a template pass in the {bold --template} arg:}
    
    {gray $} npm create expo-app {cyan --template}

    {gray The package manager used for installing}
    {gray node modules is based on how you invoke the CLI:}
    
    {bold  npm:} {cyan npm create expo-app}
    {bold yarn:} {cyan yarn create expo-app}
    {bold pnpm:} {cyan pnpm create expo-app}
    `
    );
  }

  try {
    const parsed = await resolveStringOrBooleanArgsAsync(argv, rawArgsMap, {
      '--template': Boolean,
      '-t': '--template',
    });

    debug(`Default args:\n%O`, args);
    debug(`Parsed:\n%O`, parsed);

    const { createAsync } = await import('./createAsync');
    await createAsync(parsed.projectRoot, {
      yes: !!args['--yes'],
      template: parsed.args['--template'],
      install: !args['--no-install'],
    });
  } catch (error: any) {
    Log.exit(error);
  } finally {
    const shouldUpdate = await (await import('./utils/update-check')).default;
    await shouldUpdate();
  }
}

run();
