import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('send [path]')
      .description(`Share the project's URL to an email address`)
      .helpGroup('core')
      .option('-s, --send-to [dest]', 'Email address to send the URL to')
      .urlOpts(),
    () => import('./sendAsync')
  );
}
