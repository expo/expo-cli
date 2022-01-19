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
      .option('-D, --dev', 'Save packages to devDependencies.')
      .description('Install a module or other package to a project'),
    () => import('./installAsync')
  );
}
