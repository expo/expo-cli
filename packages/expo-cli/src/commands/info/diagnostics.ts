import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('diagnostics [path]')
      .description('Log environment info to the console')
      .helpGroup('info'),
    () => import('./diagnosticsAsync')
  );
}
