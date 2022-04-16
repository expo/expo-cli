import chalk from 'chalk';
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
      .option('--no-install', 'Skip installing npm packages or CocoaPods.')
      .option('--name <name>', chalk`{yellow Deprecated}: Use {bold expo init [name]} instead.`)
      .option('--yes', 'Use default options. Same as "expo init . --template blank')
      .option('--yarn', 'Use Yarn to install dependencies. (default when Yarn is installed)'),
    // pnpm requires some manual setup, including defining a `.npmrc` file with `node-linker=hoisted` and using `index.js` as entrypoint
    // .option('--pnpm', 'Use pnpm to install dependencies.'),
    () => import('./initAsync')
  );
}
