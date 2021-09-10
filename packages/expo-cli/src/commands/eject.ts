import chalk from 'chalk';
import type { Command } from 'commander';

import { learnMore } from './utils/TerminalLink';
import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('eject [path]')
      .description(
        `Create native iOS and Android project files. ${chalk.dim(
          learnMore('https://docs.expo.dev/workflow/customizing/')
        )}`
      )
      .longDescription(
        'Create Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.'
      )
      .helpGroup('eject')
      .option('--no-install', 'Skip installing npm packages and CocoaPods.')
      .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
      .option(
        '-p, --platform <all|android|ios>',
        'Platforms to sync: ios, android, all. Default: all'
      ),
    () => import('./ejectAsync')
  );
}
