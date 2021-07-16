import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('publish:set [path]')
      .alias('ps')
      .description('Specify the channel to serve a published release')
      .helpGroup('publish')
      .option(
        '-c, --release-channel <channel-name>',
        'The channel to set the published release. (Required)'
      )
      .option(
        '-p, --publish-id <publish-id>',
        'The id of the published release to serve from the channel. (Required)'
      ),
    () => import('./publish/publishSetAsync'),
    { checkConfig: true }
  );

  applyAsyncActionProjectDir(
    program
      .command('publish:rollback [path]')
      .alias('pr')
      .description('Undo an update to a channel')
      .helpGroup('publish')
      .option('--channel-id <channel-id>', 'This flag is deprecated.')
      .option('-c, --release-channel <channel-name>', 'The channel to rollback from. (Required)')
      .option('-s, --sdk-version <version>', 'The sdk version to rollback. (Required)')
      .option('-p, --platform <ios|android>', 'The platform to rollback.'),
    () => import('./publish/publishRollbackAsync'),
    { checkConfig: true }
  );
}
