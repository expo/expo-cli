import chalk from 'chalk';
import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('publish [path]')
      .alias('p')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas update`} in eas-cli`)
      .helpGroup('deprecated')
      .option('-q, --quiet', 'Suppress verbose output from the Metro bundler.')
      .option('-s, --send-to [dest]', 'A phone number or email address to send a link to')
      .option('-c, --clear', 'Clear the Metro bundler cache')
      .option(
        '-t, --target <managed|bare>',
        'Target environment for which this publish is intended. Options are `managed` or `bare`.'
      )
      // TODO(anp) set a default for this dynamically based on whether we're inside a container?
      .option('--max-workers <num>', 'Maximum number of tasks to allow Metro to spawn.')
      .option(
        '--release-channel <name>',
        "The release channel to publish to. Default is 'default'.",
        'default'
      ),
    () => import('./publishAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('publish:set [path]')
      .alias('ps')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas update:republish`} in eas-cli`)
      .helpGroup('deprecated')
      .option(
        '-c, --release-channel <name>',
        'The channel to set the published release. (Required)'
      )
      .option(
        '-p, --publish-id <publish-id>',
        'The id of the published release to serve from the channel. (Required)'
      ),
    () => import('./publishSetAsync'),
    { checkConfig: true }
  );

  applyAsyncActionProjectDir(
    program
      .command('publish:rollback [path]')
      .alias('pr')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas update:republish`} in eas-cli`)
      .helpGroup('deprecated')
      .option('--channel-id <channel-id>', 'This flag is deprecated.')
      .option('-c, --release-channel <name>', 'The channel to rollback from. (Required)')
      .option('-s, --sdk-version <version>', 'The sdk version to rollback. (Required)')
      .option('-p, --platform <android|ios>', 'The platform to rollback.'),
    () => import('./publishRollbackAsync'),
    { checkConfig: true }
  );

  applyAsyncActionProjectDir(
    program
      .command('publish:history [path]')
      .alias('ph')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas update:list`} in eas-cli`)
      .helpGroup('deprecated')
      .option(
        '-c, --release-channel <name>',
        'Filter by release channel. If this flag is not included, the most recent publications will be shown.'
      )
      .option(
        '--count <number-of-logs>',
        'Number of logs to view, maximum 100, default 5.',
        parseInt
      )
      .option(
        '-p, --platform <android|ios>',
        'Filter by platform, android or ios. Defaults to both platforms.'
      )
      .option('-s, --sdk-version <version>', 'Filter by SDK version e.g. 35.0.0')
      .option('-r, --raw', 'Produce some raw output.'),
    () => import('./publishHistoryAsync'),
    { checkConfig: true }
  );

  applyAsyncActionProjectDir(
    program
      .command('publish:details [path]')
      .alias('pd')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas update:view`} in eas-cli`)
      .helpGroup('deprecated')
      .option('--publish-id <publish-id>', 'Publication id. (Required)')
      .option('-r, --raw', 'Produce some raw output.'),
    () => import('./publishDetailsAsync'),
    { checkConfig: true }
  );
}
