import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('customize:web [path]')
      .description('Eject the default web files for customization')
      .helpGroup('eject')
      .option('-f, --force', 'Allows replacing existing files')
      .allowOffline(),
    () => import('./customizeAsync')
  );
}
