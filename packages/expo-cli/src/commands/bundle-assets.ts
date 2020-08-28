import { Detach } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';
import terminalLink from 'terminal-link';

import log from '../log';

type Options = {
  dest?: string;
  platform?: string;
};

async function action(projectDir: string, options: Options) {
  try {
    await Detach.bundleAssetsAsync(projectDir, options);
  } catch (e) {
    log.error(e);
    log.error(
      `Before making a release build, make sure you have run '${chalk.bold(
        'expo publish'
      )}' at least once. ${terminalLink(
        'Learn more.',
        'https://expo.fyi/release-builds-with-expo-updates'
      )}`
    );
    process.exit(1);
  }
}

export default function(program: Command) {
  program
    .command(
      'bundle-assets <path>',
      'Bundles assets for a detached app. This command should be executed from xcode or gradle',
      { noHelp: true }
    )
    .helpGroup('internal')
    .option('--dest [dest]', 'Destination directory for assets')
    .option('--platform [platform]', 'detached project platform')
    .asyncActionProjectDir(action);
}
