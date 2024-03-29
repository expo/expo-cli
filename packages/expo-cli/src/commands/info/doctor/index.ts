import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('doctor [path]')
      .description('Diagnose issues with the project')
      .helpGroup('info')
      .option('--fix-dependencies', 'Fix incompatible dependency versions'),
    () => import('./doctorAsync')
  );
}
