import ora from 'ora';
import { getConfig } from '@expo/config';
import { ApiV2, Project, UserManager } from '@expo/xdl';
import { Command } from 'commander';
import log from '../log';
import prompt from '../prompt';
import * as table from '../commands/utils/cli-table';
import {
  Publication,
  RollbackOptions,
  getPublicationDetailAsync,
  getPublishHistoryAsync,
  printPublicationDetailAsync,
  rollbackPublicationFromChannelAsync,
  setPublishToChannelAsync,
} from './utils/PublishUtils';

export default function(program: Command) {
  program
    .command('publish:set [project-dir]')
    .alias('ps')
    .description('Set a published release to be served from a specified channel.')
    .option(
      '-c, --release-channel <channel-name>',
      'The channel to set the published release. (Required)'
    )
    .option(
      '-p, --publish-id <publish-id>',
      'The id of the published release to serve from the channel. (Required)'
    )
    .asyncActionProjectDir(
      async (
        projectDir: string,
        options: { releaseChannel?: string; publishId?: string }
      ): Promise<void> => {
        if (!options.releaseChannel) {
          throw new Error('You must specify a release channel.');
        }
        if (!options.publishId) {
          throw new Error('You must specify a publish id. You can find ids using publish:history.');
        }
        try {
          const result = await setPublishToChannelAsync(
            projectDir,
            options as { releaseChannel: string; publishId: string }
          );
          let tableString = table.printTableJson(
            result.queryResult,
            'Channel Set Status ',
            'SUCCESS'
          );
          console.log(tableString);
        } catch (e) {
          log.error(e);
        }
      }
    );
  program
    .command('publish:rollback [project-dir]')
    .alias('pr')
    .description('Rollback an update to a channel.')
    .option('--channel-id <channel-id>', 'This flag is deprecated.')
    .option('-c, --release-channel <channel-name>', 'The channel to rollback from. (Required)')
    .option('-s, --sdk-version <version>', 'The sdk version to rollback. (Required)')
    .option('-p, --platform <ios|android>', 'The platform to rollback.')
    .asyncActionProjectDir(
      async (
        projectDir: string,
        options: {
          releaseChannel?: string;
          sdkVersion?: string;
          platform?: string;
          channelId?: string;
        }
      ): Promise<void> => {
        if (options.channelId) {
          throw new Error('This flag is deprecated');
        }
        if (!options.releaseChannel) {
          throw new Error('You must specify a release channel.');
        }
        if (!options.sdkVersion) {
          throw new Error('You must specify an sdk version.');
        }
        if (options.platform) {
          if (options.platform !== 'android' && options.platform !== 'ios') {
            throw new Error('Platform must be either android or ios');
          }
        }
        await rollbackPublicationFromChannelAsync(projectDir, options as RollbackOptions);
      }
    );
}
