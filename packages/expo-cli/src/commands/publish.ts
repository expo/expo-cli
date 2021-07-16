import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('publish [path]')
      .alias('p')
      .description('Deploy a project to Expo hosting')
      .helpGroup('core')
      .option('-q, --quiet', 'Suppress verbose output from the Metro bundler.')
      .option('-s, --send-to [dest]', 'A phone number or email address to send a link to')
      .option('-c, --clear', 'Clear the Metro bundler cache')
      .option(
        '-t, --target [env]',
        'Target environment for which this publish is intended. Options are `managed` or `bare`.'
      )
      // TODO(anp) set a default for this dynamically based on whether we're inside a container?
      .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
      .option(
        '--release-channel <release channel>',
        "The release channel to publish to. Default is 'default'.",
        'default'
      ),
    () => import('./publishAsync')
  );
}
