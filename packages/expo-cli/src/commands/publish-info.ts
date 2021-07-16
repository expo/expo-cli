import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default (program: Command) => {
  applyAsyncActionProjectDir(
    program
      .command('publish:history [path]')
      .alias('ph')
      .description("Log the project's releases")
      .helpGroup('publish')
      .option(
        '-c, --release-channel <channel-name>',
        'Filter by release channel. If this flag is not included, the most recent publications will be shown.'
      )
      .option(
        '--count <number-of-logs>',
        'Number of logs to view, maximum 100, default 5.',
        parseInt
      )
      .option(
        '-p, --platform <ios|android>',
        'Filter by platform, android or ios. Defaults to both platforms.'
      )
      .option('-s, --sdk-version <version>', 'Filter by SDK version e.g. 35.0.0')
      .option('-r, --raw', 'Produce some raw output.'),
    () => import('./publish/publishHistoryAsync'),
    { checkConfig: true }
  );

  applyAsyncActionProjectDir(
    program
      .command('publish:details [path]')
      .alias('pd')
      .description('Log details of a published release')
      .helpGroup('publish')
      .option('--publish-id <publish-id>', 'Publication id. (Required)')
      .option('-r, --raw', 'Produce some raw output.'),
    () => import('./publish/publishDetailsAsync'),

    { checkConfig: true }
  );
};
