import { Command } from 'commander';

import prompt from '../../prompts';
import buildAndroidClientAsync from './buildAndroidClientAsync';

type Options = {
  platform?: string;
};

async function runAsync(projectRoot: string, options: Options) {
  const platform = options.platform?.toLowerCase() ?? (await promptForPlatformAsync());
  if (platform === 'android') {
    await buildAndroidClientAsync(projectRoot, {});
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
    .asyncActionProjectDir(runAsync);
}
