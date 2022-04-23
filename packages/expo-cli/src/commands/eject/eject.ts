import chalk from 'chalk';
import { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('eject [path]')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`expo prebuild`}`)
      .longDescription(
        'Create Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.'
      )
      .helpGroup('deprecated')
      .option('--no-install', 'Skip installing npm packages and CocoaPods.')
      .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
      .option(
        '-p, --platform <all|android|ios>',
        'Platforms to sync: ios, android, all. Default: all'
      ),
    () => import('./ejectAsync')
  );
}
