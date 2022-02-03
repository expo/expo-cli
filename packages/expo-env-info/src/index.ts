#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';

import { actionAsync } from './diagnosticsAsync';

const packageJson = () => require('../package.json');

const command = new Command(packageJson().name)
  .version(packageJson().version)
  .command('diagnostics [path]')
  .description('Log environment info to the console')
  .parse(process.argv);

async function run() {
  const args = command.args;
  let projectRoot = args[0];

  if (!projectRoot) {
    projectRoot = process.cwd();
  } else {
    projectRoot = path.resolve(process.cwd(), projectRoot);
  }

  await actionAsync(projectRoot);
}

run();
