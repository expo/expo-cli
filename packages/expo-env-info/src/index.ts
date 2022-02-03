#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

import { actionAsync } from './diagnosticsAsync';

const packageJson = () => require('../package.json');

async function run() {
  const args = process.argv.slice(2);

  if (args.some(arg => ['-V', '-v', '--version'].includes(arg))) {
    logVersionAndExit();
  }

  if (args.some(arg => ['-H', '-h', '--help'].includes(arg))) {
    logHelpAndExit();
  }

  const projectRoot = path.resolve(process.cwd(), args[0] ?? process.cwd());

  fs.promises
    .access(projectRoot, fs.constants.F_OK)
    .then(async () => {
      await actionAsync(projectRoot);
    })
    .catch(err => {
      if (err) {
        console.error(`\x1b[31mProject directory ${projectRoot} does not exist\x1b[0m`);
        process.exit(1);
      }
    });
}

function logVersionAndExit() {
  console.log(packageJson().version);
  process.exit(0);
}

function logHelpAndExit() {
  console.log(`
  Usage: npx expo-env-info [path] [options]

  Log environment info to the console

  Options:

    -h, --help       output usage information
    -v, --version    output the version number`);
  process.exit(0);
}

run();
