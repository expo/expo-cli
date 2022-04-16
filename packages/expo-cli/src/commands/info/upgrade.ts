import type { Command } from 'commander';

import { applyAsyncAction } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncAction<string>(
    program
      .command('upgrade [sdk-version]')
      .alias('update')
      .description('Upgrade the project packages and config for the given SDK version')
      .helpGroup('info')
      .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
      .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
      .option('--pnpm', 'Use pnpm to install dependencies. (default when pnpm-lock.yaml exists)'),
    () => import('./upgradeAsync')
  );
}
