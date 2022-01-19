import type { Command } from 'commander';

import { applyAnyAsyncAction } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAnyAsyncAction(
    program
      .command('whoami')
      .helpGroup('auth')
      .alias('w')
      .description('Return the currently authenticated account'),
    () => import('./whoamiAsync')
  );
}
