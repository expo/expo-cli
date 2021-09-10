import type { Command } from 'commander';

import { applyAsyncAction } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncAction<string[]>(
    program
      .command('install [packages...]')
      .alias('add')
      .helpGroup('core')
      .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
      .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
      .description('Install a unimodule or other package to a project'),
    () => import('./installAsync')
  );
}
