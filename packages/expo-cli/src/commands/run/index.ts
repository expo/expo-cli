import { Command } from 'commander';

import buildIosClientAsync from './buildIosClientAsync';

type Options = object;

async function runIosAsync(projectRoot: string, options: Options) {
  await buildIosClientAsync(projectRoot, options);
}

export default function (program: Command) {
  program
    .command('run:ios [path]')
    .helpGroup('internal')
    .description('Build a development client and run it in a simulator.')
    .asyncActionProjectDir(runIosAsync);
}
