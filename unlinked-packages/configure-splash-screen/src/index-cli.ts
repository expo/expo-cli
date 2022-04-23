#!/usr/bin/env node

import createCommand from './cli-command';

async function runAsync() {
  try {
    await createCommand().parseAsync(process.argv);
  } catch (e: any) {
    console.error(`\n${e.message}\n`);
    process.exit(1);
  }
}

runAsync();
