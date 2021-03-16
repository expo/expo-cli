import { Command } from 'commander';

import CommandError from '../../CommandError';
import buildAndroidClientAsync from './buildAndroidClientAsync';

type Options = {
  platform?: string;
  buildVariant?: string;
};

async function runAndroidAsync(projectRoot: string, options: Options) {
  if (typeof options.buildVariant !== 'string') {
    throw new CommandError('--build-variant must be a string');
  }
  await buildAndroidClientAsync(projectRoot, {
    buildVariant: options.buildVariant,
  });
}

export default function (program: Command) {
  program
    .command('run:android [path]')
    .helpGroup('experimental')
    .description('Build a development client and run it in on a device.')
    .option('--build-variant [name]', '(Android) build variant', 'release')
    .asyncActionProjectDir(runAndroidAsync);
}
