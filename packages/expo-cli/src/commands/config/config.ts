import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('config [path]')
      .description('Show the project config')
      .helpGroup('info')
      .option('-t, --type <public|prebuild|introspect>', 'Type of config to show.')
      .option('--full', 'Include all project config data'),
    () => import('./configAsync')
  );
}
