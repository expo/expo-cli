import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('config [path]')
      .description('Show the project config')
      .helpGroup('info')
      .option('-t, --type <type>', 'Type of config to show. Options: public, prebuild, introspect')
      .option('--full', 'Include all project config data'),
    () => import('./configAsync')
  );
}
