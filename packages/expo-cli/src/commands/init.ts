import type { Command } from 'commander';

import { applyAsyncAction } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncAction<string>(
    program
      .command('init [name]')
      .alias('i')
      .helpGroup('core')
      .description('Create a new Expo project')
      .option(
        '-t, --template [name]',
        'Specify which template to use. Valid options are "blank", "tabs", "bare-minimum" or a package on npm (e.g. "expo-template-bare-minimum") that includes an Expo project template.'
      )
      .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
      .option('--yarn', 'Use Yarn to install dependencies. (default when Yarn is installed)')
      .option('--no-install', 'Skip installing npm packages or CocoaPods.')
      .option('--name [name]', 'The name of your app visible on the home screen.')
      .option('--yes', 'Use default options. Same as "expo init . --template blank'),
    () => import('./initAsync')
  );
}
