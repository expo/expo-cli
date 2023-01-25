#!/usr/bin/env node
import { constants, promises as fs } from 'fs';
import path from 'path';

import { actionAsync } from './doctorAsync';

const packageJson = () => require('../package.json');

async function run() {
  const args = process.argv.slice(2);

  if (args.some(arg => ['-V', '-v', '--version'].includes(arg))) {
    logVersionAndExit();
  }

  if (args.some(arg => ['-h', '--help'].includes(arg))) {
    logHelpAndExit();
  }

  // TODO: add offline flag

  const projectRoot = path.resolve(process.cwd(), args[0] ?? process.cwd());

  await fs.access(projectRoot, constants.F_OK).catch((err: any) => {
    if (err) {
      console.error(`\x1b[31mProject directory ${projectRoot} does not exist\x1b[0m`);
      process.exit(1);
    }
  });

  await actionAsync(projectRoot);
}

function logVersionAndExit() {
  console.log(packageJson().version);
  process.exit(0);
}

function logHelpAndExit() {
  console.log(`
  Usage: npx expo-doctor [path] [options]

  Diagnose issues with the project

  Options:

    -h, --help       output usage information
    -v, --version    output the version number`);
  process.exit(0);
}

run();
