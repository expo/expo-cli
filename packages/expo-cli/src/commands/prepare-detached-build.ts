import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('prepare-detached-build [path]')
      .description('Prepare a detached project for building')
      .helpGroup('internal')
      .option('--platform [platform]', 'detached project platform')
      .option('--skipXcodeConfig [bool]', '[iOS only] if true, do not configure Xcode project'),
    () => import('./prepareDetachedBuildAsync')
  );
}
