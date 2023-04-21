import chalk from 'chalk';
import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('push:android:upload [path]')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas credentials`} in eas-cli`)
      .helpGroup('deprecated')
      .option('--api-key [api-key]', 'Server API key for FCM.'),
    () => import('./push/removalNotice')
  );

  applyAsyncActionProjectDir(
    program
      .command('push:android:show [path]')
      .description('Log the value currently in use for FCM notifications for this project')
      .helpGroup('deprecated'),
    () => import('./push/removalNotice')
  );

  applyAsyncActionProjectDir(
    program
      .command('push:android:clear [path]')
      .description('Delete a previously uploaded FCM credential')
      .helpGroup('deprecated'),
    () => import('./push/removalNotice')
  );
}
