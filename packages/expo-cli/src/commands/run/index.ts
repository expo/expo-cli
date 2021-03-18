import { Command } from 'commander';

import CommandError from '../../CommandError';
import buildAndroidClientAsync from './buildAndroidClientAsync';
import { runIosActionAsync } from './ios/runIos';

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
  program
    .command('run:ios [path]')
    .description('Run the iOS app binary locally')
    .helpGroup('internal')
    .option('-d, --device [device]', 'Device name or UDID to build the app on')
    .option('-p, --port <port>', 'Port to start the Metro bundler on. Default: 8081')
    .option('--scheme <scheme>', 'Scheme to build')
    .option('--bundler', 'Should start the bundler automatically')
    .option(
      '--configuration <configuration>',
      'Xcode configuration to use. Debug or Release. Default: Debug'
    )
    .asyncActionProjectDir(runIosActionAsync, { checkConfig: false });
}
