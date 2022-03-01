import chalk from 'chalk';
import type { Command } from 'commander';

import Log from '../log';
import { applyAsyncAction } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncAction<string[]>(
    program
      .command('install [packages...]')
      .alias('add')
      .helpGroup('core')
      .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
      .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
      .description('Install a module or other package to a project')
      .on('--help', () => {
        Log.log(
          `  Additional options can be passed to the ${chalk.green('npm install')} or ${chalk.green(
            'yarn add'
          )} command by using ${chalk.green('--')}`
        );
        Log.log(`  For example: ${chalk.green('expo install somepackage -- --verbose')}`);
      }),
    () => import('./installAsync')
  );
}
