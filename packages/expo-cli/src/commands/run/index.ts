import { Command } from 'commander';

import CommandError from '../../CommandError';
import prompt from '../../prompts';
import buildAndroidClientAsync from './buildAndroidClientAsync';

type Options = {
  platform?: string;
  buildVariant?: string;
};

async function runAsync(projectRoot: string, options: Options) {
  const platform = options.platform?.toLowerCase() ?? (await promptForPlatformAsync());
  if (platform === 'android') {
    if (typeof options.buildVariant !== 'string') {
      throw new CommandError('--build-variant must be a string');
    }
    await buildAndroidClientAsync(projectRoot, {
      buildVariant: options.buildVariant,
    });
  } else {
    throw new Error('platform not implemented');
  }
}

async function promptForPlatformAsync(): Promise<'android' | 'ios'> {
  const { platform } = await prompt({
    type: 'select',
    message: 'Choose platform',
    name: 'platform',
    choices: [
      {
        title: 'Android',
        value: 'android',
      },
      {
        title: 'iOS',
        value: 'ios',
      },
    ],
  });
  return platform;
}

export default function (program: Command) {
  program
    .command('run [path]')
    .helpGroup('experimental')
    .description('Build a development client and run it in on a device.')
    .option('-p --platform <platform>', 'Platform: [android|ios]', /^(android|ios)$/i)
    .option('--build-variant [name]', '(Android) build variant', 'release')
    .asyncActionProjectDir(runAsync);
}
