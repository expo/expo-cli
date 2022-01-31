import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('codesigning:configure [path]')
      .description('Configure and validate expo-updates code signing for this project')
      .helpGroup('codesigning')
      .option('-i, --input <directory>', 'Directory containing keys and certificate'),
    () => import('./configureCodeSigningAsync')
  );
}
