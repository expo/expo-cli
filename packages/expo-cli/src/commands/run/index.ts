import { Command } from 'commander';

import buildIosClientAsync from './buildIosClientAsync';

type Options = object;

async function runAsync(projectRoot: string, options: Options) {
  await buildIosClientAsync(projectRoot, options);
}

export default function (program: Command) {
  program
    .command('run [path]')
    .helpGroup('experimental')
    .description('Build a development client and run it in a simulator.')
    .asyncActionProjectDir(runAsync);
}
